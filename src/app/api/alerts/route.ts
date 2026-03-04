import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiPaginated, apiUnauthorized, apiForbidden, getPaginationParams, getSortParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, AlertStatus } from '@prisma/client';

// GET - List alerts
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
    const alertType = request.nextUrl.searchParams.get('alertType');

    // Build where clause
    let where: Record<string, unknown> = {};

    if (userRole === 'SUPER_ADMIN') {
      if (branchId && branchId !== 'null') where.branchId = branchId;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      const branches = await db.branch.findMany({
        where: { companyId: userCompanyId },
        select: { id: true },
      });
      const branchIds = branches.map(b => b.id);
      if (branchId && branchId !== 'null' && branchIds.includes(branchId)) {
        where.branchId = branchId;
      } else {
        where.branchId = { in: branchIds };
      }
    } else if (userBranchId) {
      where.branchId = userBranchId;
    } else {
      return apiPaginated([], page, limit, 0);
    }

    if (status) where.status = status;
    if (alertType) where.alertType = alertType;

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          acknowledgedByUser: { select: { id: true, name: true } },
        },
      }),
      db.alert.count({ where }),
    ]);

    return apiPaginated(alerts, page, limit, total);
  } catch (error) {
    console.error('List alerts error:', error);
    return apiError('Failed to fetch alerts', 500);
  }
}
