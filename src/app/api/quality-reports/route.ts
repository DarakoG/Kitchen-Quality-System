import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, getPaginationParams, getSortParams, getDateRangeFilter } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, Shift, QualityStatus } from '@prisma/client';

const qualityReportItemSchema = z.object({
  checklistItemId: z.string(),
  scoreValue: z.number().min(1).max(5).optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
  textValue: z.string().optional().nullable(),
  isPassed: z.boolean(),
  notes: z.string().optional().nullable(),
});

const qualityReportSchema = z.object({
  branchId: z.string(),
  dishId: z.string(),
  shift: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'NIGHT', 'ALL_DAY']),
  evaluationDate: z.string().transform(v => new Date(v)),
  exitTime: z.number().int().min(0).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(qualityReportItemSchema).min(1),
});

// GET - List quality reports
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
    const dishId = request.nextUrl.searchParams.get('dishId');
    const status = request.nextUrl.searchParams.get('status');
    const shift = request.nextUrl.searchParams.get('shift');

    // Build where clause based on role
    let where: Record<string, unknown> = {};

    if (userRole === 'SUPER_ADMIN') {
      // Super admin can see all or filter by branch
      if (branchId) where.branchId = branchId;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      // Get branches for company
      const branches = await db.branch.findMany({
        where: { companyId: userCompanyId },
        select: { id: true },
      });
      const companyBranchIds = branches.map(b => b.id);
      // If specific branch requested, check it belongs to company
      if (branchId) {
        if (!companyBranchIds.includes(branchId)) {
          return apiUnauthorized('Cannot access this branch');
        }
        where.branchId = branchId;
      } else {
        where.branchId = { in: companyBranchIds };
      }
    } else if (userBranchId) {
      where.branchId = userBranchId;
    } else {
      return apiUnauthorized('No branch access');
    }

    if (dishId) where.dishId = dishId;
    if (status) where.status = status;
    if (shift) where.shift = shift;

    // Date range
    const dateRange = getDateRangeFilter(request.nextUrl.searchParams, 'evaluationDate');
    if (dateRange) Object.assign(where, dateRange);

    const [reports, total] = await Promise.all([
      db.qualityReport.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          dish: { select: { id: true, name: true, category: { select: { name: true } } } },
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              checklistItem: { select: { name: true, type: true } },
            },
          },
        },
      }),
      db.qualityReport.count({ where }),
    ]);

    return apiPaginated(reports, page, limit, total);
  } catch (error) {
    console.error('List quality reports error:', error);
    return apiError('Failed to fetch quality reports', 500);
  }
}

// POST - Create quality report
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
    const validated = qualityReportSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Verify branch access
    const branch = await db.branch.findUnique({
      where: { id: validated.data.branchId },
      include: { company: true },
    });

    if (!branch) {
      return apiError('Branch not found', 404);
    }

    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== branch.companyId) {
        return apiUnauthorized('Cannot access this branch');
      }
      if (userBranchId && userBranchId !== validated.data.branchId) {
        return apiUnauthorized('Cannot access this branch');
      }
    }

    // Verify dish
    const dish = await db.dish.findUnique({
      where: { id: validated.data.dishId },
      include: { checklistItems: { where: { isActive: true } } },
    });

    if (!dish) {
      return apiError('Dish not found', 404);
    }

    if (dish.companyId !== branch.companyId) {
      return apiError('Dish does not belong to this company', 400);
    }

    // Calculate overall score
    let totalScore = 0;
    let totalWeight = 0;
    let allPassed = true;

    for (const item of validated.data.items) {
      const checklistItem = dish.checklistItems.find(ci => ci.id === item.checklistItemId);
      if (!checklistItem) {
        return apiError(`Invalid checklist item: ${item.checklistItemId}`, 400);
      }

      if (!item.isPassed && checklistItem.isRequired) {
        allPassed = false;
      }

      // Calculate score contribution
      if (item.scoreValue !== null && item.scoreValue !== undefined) {
        totalScore += item.scoreValue * checklistItem.weight;
        totalWeight += 5 * checklistItem.weight; // Max score is 5
      } else if (item.booleanValue !== null && item.booleanValue !== undefined) {
        totalScore += (item.booleanValue ? 5 : 0) * checklistItem.weight;
        totalWeight += 5 * checklistItem.weight;
      }
    }

    const overallScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
    const status: QualityStatus = allPassed ? 'APPROVED' : 'REJECTED';

    // Create report with items in transaction
    const report = await db.$transaction(async (tx) => {
      const newReport = await tx.qualityReport.create({
        data: {
          branchId: validated.data.branchId,
          dishId: validated.data.dishId,
          userId,
          shift: validated.data.shift as Shift,
          evaluationDate: validated.data.evaluationDate,
          status,
          overallScore,
          exitTime: validated.data.exitTime,
          photoUrl: validated.data.photoUrl,
          notes: validated.data.notes,
          items: {
            create: validated.data.items.map(item => ({
              checklistItemId: item.checklistItemId,
              scoreValue: item.scoreValue,
              booleanValue: item.booleanValue,
              textValue: item.textValue,
              isPassed: item.isPassed,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return newReport;
    });

    await createAuditLog({
      companyId: branch.companyId,
      branchId: validated.data.branchId,
      userId,
      action: 'CREATE',
      entityType: 'QualityReport',
      entityId: report.id,
      newValues: { status, overallScore, dishId: validated.data.dishId },
    });

    return apiSuccess(report, 'Quality report created successfully', 201);
  } catch (error) {
    console.error('Create quality report error:', error);
    return apiError('Failed to create quality report', 500);
  }
}
