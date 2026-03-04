import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
// Users API route - handles user CRUD operations
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, getPaginationParams, getSortParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@prisma/client';

const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR']),
  companyId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  branchIds: z.array(z.string()).optional(), // Multiple branches
  phone: z.string().optional(),
});

// GET - List users
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
    const search = request.nextUrl.searchParams.get('search');
    const companyId = request.nextUrl.searchParams.get('companyId');
    const branchId = request.nextUrl.searchParams.get('branchId');
    const role = request.nextUrl.searchParams.get('role');

    // Build where clause
    let where: Record<string, unknown> = {};

    if (userRole === 'SUPER_ADMIN') {
      if (companyId) where.companyId = companyId;
    } else if (userRole === 'COMPANY_ADMIN' && userCompanyId) {
      where.companyId = userCompanyId;
    } else if (userBranchId) {
      // For users with branch access, show users in same branch
      where.branchId = userBranchId;
    } else {
      return apiUnauthorized('No user access');
    }

    if (branchId) {
      where.branchId = branchId;
    }
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          companyId: true,
          branchId: true,
          avatar: true,
          lastLogin: true,
          createdAt: true,
          company: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    // Transform users to include branches array (empty for now due to Prisma cache issue)
    const transformedUsers = users.map(user => ({
      ...user,
      branches: user.branch ? [user.branch] : [],
    }));

    return apiPaginated(transformedUsers, page, limit, total);
  } catch (error) {
    console.error('List users error:', error);
    return apiError('Failed to fetch users', 500);
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    const currentUserRole = request.headers.get('x-user-role') as UserRole | null;
    const currentUserCompanyId = request.headers.get('x-user-company-id');

    if (!currentUserId) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const validated = userCreateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Check permissions
    if (currentUserRole !== 'SUPER_ADMIN') {
      // Cannot create SUPER_ADMIN
      if (validated.data.role === 'SUPER_ADMIN') {
        return apiError('Cannot create Super Admin users', 403);
      }
      // Company Admin can only create users in their company
      if (currentUserRole === 'COMPANY_ADMIN') {
        if (!currentUserCompanyId || validated.data.companyId !== currentUserCompanyId) {
          return apiError('Cannot create users for other companies', 403);
        }
      }
    }

    // Check if email already exists
    const existingEmail = await db.user.findUnique({
      where: { email: validated.data.email.toLowerCase() },
    });

    if (existingEmail) {
      return apiError('Email already registered', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.data.password || 'temp123456');

    // Create user
    const { branchIds, ...userData } = validated.data;
    
    // Determine company for non-SUPER_ADMIN roles
    let companyId = userData.companyId;
    if (currentUserRole === 'COMPANY_ADMIN' && currentUserCompanyId) {
      companyId = currentUserCompanyId;
    }

    // Use the first branch from branchIds as the primary branch for now
    const primaryBranchId = branchIds && branchIds.length > 0 ? branchIds[0] : userData.branchId;

    const user = await db.user.create({
      data: {
        email: validated.data.email.toLowerCase(),
        password: hashedPassword,
        name: validated.data.name,
        role: validated.data.role as UserRole,
        companyId: companyId || null,
        branchId: primaryBranchId || null,
        phone: userData.phone || null,
      },
      include: {
        company: true,
        branch: true,
      },
    });

    await createAuditLog({
      companyId: companyId || undefined,
      branchId: primaryBranchId || undefined,
      userId: currentUserId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValues: { email: user.email, name: user.name, role: user.role, branchIds: branchIds || [primaryBranchId] },
    });

    // Transform response
    const responseUser = {
      ...user,
      branches: user.branch ? [user.branch] : [],
    };

    return apiSuccess(responseUser, 'User created successfully', 201);
  } catch (error) {
    console.error('Create user error:', error);
    return apiError('Failed to create user', 500);
  }
}
