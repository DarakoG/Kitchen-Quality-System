import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden, getPaginationParams, getSortParams, apiPaginated } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole } from '@prisma/client';

const incidentSchema = z.object({
  branchId: z.string(),
  dishId: z.string().optional().nullable(),
  qualityReportId: z.string().optional().nullable(),
  incidentType: z.string().min(2),
  description: z.string().min(10),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  correctiveAction: z.string().optional().nullable(),
});

// GET - List incidents
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const orderBy = getSortParams(request.nextUrl.searchParams);
    const branchId = request.nextUrl.searchParams.get('branchId');
    const status = request.nextUrl.searchParams.get('status');
    const severity = request.nextUrl.searchParams.get('severity');

    // Build where clause
    let where: Record<string, unknown> = {};

    if (userRole === 'SUPER_ADMIN') {
      // Super admin can see all incidents, or filter by branch if specified
      if (branchId && branchId !== 'null') where.branchId = branchId;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      // Company admin can only see incidents from their company's branches
      const branches = await db.branch.findMany({
        where: { companyId: userCompanyId },
        select: { id: true },
      });
      const branchIds = branches.map(b => b.id);
      // If a specific branch is requested and it's in the company's branches, filter by it
      if (branchId && branchId !== 'null' && branchIds.includes(branchId)) {
        where.branchId = branchId;
      } else {
        where.branchId = { in: branchIds };
      }
    } else if (userBranchId) {
      // Users with a branch can only see incidents from their branch
      where.branchId = userBranchId;
    } else {
      // User has no branch access
      return apiPaginated([], page, limit, 0);
    }

    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      db.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          dish: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      db.incident.count({ where }),
    ]);

    return apiPaginated(incidents, page, limit, total);
  } catch (error) {
    console.error('List incidents error:', error);
    return apiError('Failed to fetch incidents', 500);
  }
}

// POST - Create incident
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const validated = incidentSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Verify branch access
    const branch = await db.branch.findUnique({
      where: { id: validated.data.branchId },
    });

    if (!branch) {
      return apiError('Branch not found', 404);
    }

    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== branch.companyId) {
        return apiUnauthorized();
      }
      if (userBranchId && userBranchId !== validated.data.branchId) {
        return apiUnauthorized();
      }
    }

    const incident = await db.incident.create({
      data: {
        branchId: validated.data.branchId,
        dishId: validated.data.dishId,
        qualityReportId: validated.data.qualityReportId,
        userId,
        incidentType: validated.data.incidentType,
        description: validated.data.description,
        severity: validated.data.severity,
        correctiveAction: validated.data.correctiveAction,
        status: 'PENDING',
      },
      include: {
        branch: { select: { name: true } },
        dish: { select: { name: true } },
      },
    });

    await createAuditLog({
      companyId: branch.companyId,
      branchId: validated.data.branchId,
      userId,
      action: 'CREATE',
      entityType: 'Incident',
      entityId: incident.id,
      newValues: validated.data,
    });

    // Check if this should create an alert (repeated failures or critical)
    await checkAndCreateAlert(
      validated.data.branchId, 
      validated.data.dishId, 
      validated.data.severity,
      validated.data.incidentType
    );

    return apiSuccess(incident, 'Incident created successfully', 201);
  } catch (error) {
    console.error('Create incident error:', error);
    return apiError('Failed to create incident', 500);
  }
}

// Helper function to check for alert conditions
async function checkAndCreateAlert(branchId: string, dishId?: string | null, severity?: string, incidentType?: string) {
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) return;

  // 1. Create immediate alert for critical incidents
  if (severity === 'critical') {
    const dish = dishId ? await db.dish.findUnique({ where: { id: dishId } }) : null;
    
    await db.alert.create({
      data: {
        branchId,
        alertType: 'CRITICAL_INCIDENT',
        title: `Critical Incident: ${incidentType || 'Unknown'}`,
        message: dish 
          ? `A critical incident has been reported for ${dish.name}. Immediate attention required.`
          : `A critical incident has been reported. Immediate attention required.`,
        threshold: 1,
        currentValue: 1,
        relatedIds: JSON.stringify({ dishId, incidentType }),
      },
    });
    return; // Don't check for repeated failures if it's critical
  }

  // 2. Check for repeated failures (only if dish is specified)
  if (!dishId) return;

  // Check for repeated failures in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentIncidents = await db.incident.count({
    where: {
      branchId,
      dishId,
      createdAt: { gte: sevenDaysAgo },
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    },
  });

  // If 3+ incidents for same dish in 7 days, create alert
  if (recentIncidents >= 3) {
    const dish = await db.dish.findUnique({ where: { id: dishId } });

    if (dish) {
      // Check if there's already an active alert for this dish
      const existingAlert = await db.alert.findFirst({
        where: {
          branchId,
          alertType: 'REPEATED_FAILURES',
          status: 'ACTIVE',
          relatedIds: { contains: dishId },
        },
      });

      if (existingAlert) {
        // Update existing alert
        await db.alert.update({
          where: { id: existingAlert.id },
          data: {
            currentValue: recentIncidents,
            message: `${recentIncidents} incidents reported for ${dish.name} in the last 7 days.`,
          },
        });
      } else {
        await db.alert.create({
          data: {
            branchId,
            alertType: 'REPEATED_FAILURES',
            title: `Repeated failures: ${dish.name}`,
            message: `${recentIncidents} incidents reported for ${dish.name} in the last 7 days.`,
            threshold: 3,
            currentValue: recentIncidents,
            relatedIds: JSON.stringify({ dishId }),
          },
        });
      }
    }
  }
}
