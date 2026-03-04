import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole } from '@prisma/client';

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

    const alert = await db.alert.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true, companyId: true } },
        acknowledgedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!alert) {
      return apiNotFound('Alert not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== alert.branch.companyId) {
        return apiForbidden();
      }
      if (userBranchId && userBranchId !== alert.branchId) {
        return apiForbidden();
      }
    }

    return apiSuccess(alert);
  } catch (error) {
    console.error('Get alert error:', error);
    return apiError('Failed to fetch alert', 500);
  }
}

// PUT - Acknowledge or close alert
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

    const existing = await db.alert.findUnique({
      where: { id },
      include: { branch: { select: { companyId: true } } },
    });

    if (!existing) {
      return apiNotFound('Alert not found');
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
    const { action } = body as { action?: 'acknowledge' | 'close' };

    let updateData: Record<string, unknown> = {};

    if (action === 'acknowledge') {
      updateData = {
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      };
    } else if (action === 'close') {
      updateData = {
        status: 'CLOSED',
        closedAt: new Date(),
      };
    }

    const alert = await db.alert.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      companyId: existing.branch.companyId,
      branchId: existing.branchId,
      userId,
      action: 'UPDATE',
      entityType: 'Alert',
      entityId: id,
      newValues: { action },
    });

    return apiSuccess(alert, `Alert ${action}d successfully`);
  } catch (error) {
    console.error('Update alert error:', error);
    return apiError('Failed to update alert', 500);
  }
}
