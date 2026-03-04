import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiPaginated, getPaginationParams } from '@/lib/api-response';
import { UserRole } from '@prisma/client';

// GET - List audit logs
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    // Only admins can view audit logs
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'].includes(userRole || '')) {
      return apiUnauthorized('Admin access required');
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const entityType = request.nextUrl.searchParams.get('entityType');
    const action = request.nextUrl.searchParams.get('action');
    const branchId = request.nextUrl.searchParams.get('branchId');

    // Build where clause
    let where: Record<string, unknown> = {};

    if (userRole === 'SUPER_ADMIN') {
      if (branchId) where.branchId = branchId;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      where.companyId = userCompanyId;
      if (branchId) where.branchId = branchId;
    } else if (userBranchId) {
      where.branchId = userBranchId;
    }

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return apiPaginated(logs, page, limit, total);
  } catch (error) {
    console.error('List audit logs error:', error);
    return apiError('Failed to fetch audit logs', 500);
  }
}
