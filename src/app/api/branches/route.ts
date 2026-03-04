import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, getPaginationParams, getSortParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { getAccessibleBranchIds } from '@/lib/auth';

const branchSchema = z.object({
  companyId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2).max(20),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  isActive: z.boolean().optional(),
  opensAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  closesAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
});

// GET - List branches
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');
    const userBranchId = request.headers.get('x-user-branch-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const orderBy = getSortParams(request.nextUrl.searchParams);
    const companyId = request.nextUrl.searchParams.get('companyId');
    const search = request.nextUrl.searchParams.get('search');

    // Build where clause based on role
    let where: Record<string, unknown> = {};

    if (userRole === 'SUPER_ADMIN') {
      if (companyId) where.companyId = companyId;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      where.companyId = userCompanyId;
      if (companyId && companyId !== userCompanyId) {
        return apiUnauthorized('Cannot access branches from other companies');
      }
    } else if (userBranchId) {
      where.id = userBranchId;
    } else {
      return apiUnauthorized('No branch access');
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const [branches, total] = await Promise.all([
      db.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: { select: { id: true, name: true, slug: true } },
          _count: { select: { users: true, qualityReports: true, incidents: true } },
        },
      }),
      db.branch.count({ where }),
    ]);

    return apiPaginated(branches, page, limit, total);
  } catch (error) {
    console.error('List branches error:', error);
    return apiError('Failed to fetch branches', 500);
  }
}

// POST - Create branch (Company Admin or Super Admin)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const validated = branchSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Check permissions
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole !== 'COMPANY_ADMIN' || userCompanyId !== validated.data.companyId) {
        return apiUnauthorized('Cannot create branches for other companies');
      }
    }

    // Check branch limit
    const company = await db.company.findUnique({
      where: { id: validated.data.companyId },
      include: { _count: { select: { branches: true } } },
    });

    if (!company) {
      return apiError('Company not found', 404);
    }

    if (company._count.branches >= company.maxBranches) {
      return apiError('Maximum branch limit reached for this company', 400);
    }

    // Check unique code within company
    const existingCode = await db.branch.findFirst({
      where: { companyId: validated.data.companyId, code: validated.data.code },
    });

    if (existingCode) {
      return apiError('Branch code already exists in this company', 409);
    }

    const branch = await db.branch.create({
      data: validated.data,
      include: { company: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      companyId: validated.data.companyId,
      branchId: branch.id,
      userId,
      action: 'CREATE',
      entityType: 'Branch',
      entityId: branch.id,
      newValues: validated.data,
    });

    return apiSuccess(branch, 'Branch created successfully', 201);
  } catch (error) {
    console.error('Create branch error:', error);
    return apiError('Failed to create branch', 500);
  }
}
