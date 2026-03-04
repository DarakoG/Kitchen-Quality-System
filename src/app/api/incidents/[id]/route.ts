import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, IncidentStatus } from '@prisma/client';

const incidentUpdateSchema = z.object({
  incidentType: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  correctiveAction: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true, companyId: true } },
        dish: { select: { id: true, name: true, category: { select: { name: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!incident) {
      return apiNotFound('Incident not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== incident.branch.companyId) {
        return apiForbidden();
      }
      if (userBranchId && userBranchId !== incident.branchId) {
        return apiForbidden();
      }
    }

    return apiSuccess(incident);
  } catch (error) {
    console.error('Get incident error:', error);
    return apiError('Failed to fetch incident', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existing = await db.incident.findUnique({
      where: { id },
      include: { branch: { select: { companyId: true } } },
    });

    if (!existing) {
      return apiNotFound('Incident not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== existing.branch.companyId) {
        return apiForbidden();
      }
      if (userBranchId && userBranchId !== existing.branchId) {
        return apiForbidden();
      }
    }

    const body = await request.json();
    const validated = incidentUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Handle status changes
    let updateData: Record<string, unknown> = { ...validated.data };
    if (validated.data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    }

    const incident = await db.incident.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      companyId: existing.branch.companyId,
      branchId: existing.branchId,
      userId,
      action: 'UPDATE',
      entityType: 'Incident',
      entityId: id,
      oldValues: existing,
      newValues: validated.data,
    });

    return apiSuccess(incident, 'Incident updated successfully');
  } catch (error) {
    console.error('Update incident error:', error);
    return apiError('Failed to update incident', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existing = await db.incident.findUnique({
      where: { id },
      include: { branch: { select: { companyId: true } } },
    });

    if (!existing) {
      return apiNotFound('Incident not found');
    }

    // Only Super Admin or Company Admin can delete
    if (userRole !== 'SUPER_ADMIN' && (userRole !== 'COMPANY_ADMIN' || userCompanyId !== existing.branch.companyId)) {
      return apiForbidden();
    }

    await db.incident.delete({ where: { id } });

    await createAuditLog({
      companyId: existing.branch.companyId,
      branchId: existing.branchId,
      userId,
      action: 'DELETE',
      entityType: 'Incident',
      entityId: id,
      oldValues: existing,
    });

    return apiSuccess({}, 'Incident deleted successfully');
  } catch (error) {
    console.error('Delete incident error:', error);
    return apiError('Failed to delete incident', 500);
  }
}
