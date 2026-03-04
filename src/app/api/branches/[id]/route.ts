import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';

const branchUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  opensAt: z.string().optional().nullable(),
  closesAt: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const branch = await db.branch.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        _count: { select: { users: true, qualityReports: true, incidents: true, alerts: true } },
      },
    });

    if (!branch) {
      return apiNotFound('Branch not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== branch.companyId) {
        return apiForbidden();
      }
      if (userBranchId && userBranchId !== id) {
        return apiForbidden();
      }
    }

    return apiSuccess(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    return apiError('Failed to fetch branch', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existing = await db.branch.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Branch not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== existing.companyId) {
        return apiForbidden();
      }
      if (userBranchId && userBranchId !== id) {
        return apiForbidden();
      }
    }

    const body = await request.json();
    const validated = branchUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    const branch = await db.branch.update({
      where: { id },
      data: validated.data,
    });

    await createAuditLog({
      companyId: existing.companyId,
      branchId: id,
      userId,
      action: 'UPDATE',
      entityType: 'Branch',
      entityId: id,
      oldValues: existing,
      newValues: validated.data,
    });

    return apiSuccess(branch, 'Branch updated successfully');
  } catch (error) {
    console.error('Update branch error:', error);
    return apiError('Failed to update branch', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existing = await db.branch.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Branch not found');
    }

    // Only Super Admin or Company Admin can delete
    if (userRole !== 'SUPER_ADMIN' && (userRole !== 'COMPANY_ADMIN' || userCompanyId !== existing.companyId)) {
      return apiForbidden();
    }

    await db.branch.delete({ where: { id } });

    await createAuditLog({
      companyId: existing.companyId,
      userId,
      action: 'DELETE',
      entityType: 'Branch',
      entityId: id,
      oldValues: existing,
    });

    return apiSuccess({}, 'Branch deleted successfully');
  } catch (error) {
    console.error('Delete branch error:', error);
    return apiError('Failed to delete branch', 500);
  }
}
