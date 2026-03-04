import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@prisma/client';

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR']).optional(),
  companyId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  branchIds: z.array(z.string()).optional(), // Multiple branches
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
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

    const user = await db.user.findUnique({
      where: { id },
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
        updatedAt: true,
        company: { select: { id: true, name: true, slug: true } },
        branch: { select: { id: true, name: true, code: true } },
        userBranches: {
          select: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!user) {
      return apiNotFound('User not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN') {
      if (userRole === 'COMPANY_ADMIN' && userCompanyId !== user.companyId) {
        return apiForbidden();
      }
      if (userBranchId && userBranchId !== user.branchId && userId !== id) {
        return apiForbidden();
      }
    }

    // Transform response
    const responseUser = {
      ...user,
      branches: user.userBranches.map(ub => ub.branch),
    };

    return apiSuccess(responseUser);
  } catch (error) {
    console.error('Get user error:', error);
    return apiError('Failed to fetch user', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUserId = request.headers.get('x-user-id');
    const currentUserRole = request.headers.get('x-user-role') as UserRole | null;
    const currentUserCompanyId = request.headers.get('x-user-company-id');

    if (!currentUserId) {
      return apiUnauthorized();
    }

    const existing = await db.user.findUnique({ 
      where: { id },
      include: { userBranches: true },
    });
    if (!existing) {
      return apiNotFound('User not found');
    }

    // Check access
    if (currentUserRole !== 'SUPER_ADMIN') {
      if (currentUserRole === 'COMPANY_ADMIN' && currentUserCompanyId !== existing.companyId) {
        return apiForbidden();
      }
    }

    const body = await request.json();
    const validated = userUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Prevent role escalation
    if (currentUserRole !== 'SUPER_ADMIN' && validated.data.role === 'SUPER_ADMIN') {
      return apiError('Cannot assign Super Admin role', 403);
    }

    // Check email uniqueness if changing
    if (validated.data.email && validated.data.email !== existing.email) {
      const existingEmail = await db.user.findUnique({
        where: { email: validated.data.email.toLowerCase() },
      });
      if (existingEmail) {
        return apiError('Email already in use', 409);
      }
    }

    // Prepare update data
    const { branchIds, ...updateData }: { branchIds?: string[]; [key: string]: unknown } = { ...validated.data };
    if (validated.data.password) {
      updateData.password = await hashPassword(validated.data.password);
    } else {
      delete updateData.password;
    }
    delete updateData.branchIds;

    // Update user with branches in a transaction
    const user = await db.$transaction(async (tx) => {
      // Update user basic info
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          companyId: true,
          branchId: true,
          company: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      // Update branches if provided
      if (branchIds !== undefined) {
        // Delete existing user-branch relationships
        await tx.userBranch.deleteMany({
          where: { userId: id },
        });

        // Create new relationships
        if (branchIds.length > 0) {
          await tx.userBranch.createMany({
            data: branchIds.map(branchId => ({
              userId: id,
              branchId,
            })),
          });
        }
      }

      return updatedUser;
    });

    // Get updated branches
    const userBranches = await db.userBranch.findMany({
      where: { userId: id },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });

    await createAuditLog({
      companyId: existing.companyId || undefined,
      branchId: existing.branchId || undefined,
      userId: currentUserId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      oldValues: { name: existing.name, email: existing.email, role: existing.role },
      newValues: { ...validated.data, branchIds },
    });

    return apiSuccess({
      ...user,
      branches: userBranches.map(ub => ub.branch),
    }, 'User updated successfully');
  } catch (error) {
    console.error('Update user error:', error);
    return apiError('Failed to update user', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUserId = request.headers.get('x-user-id');
    const currentUserRole = request.headers.get('x-user-role') as UserRole | null;
    const currentUserCompanyId = request.headers.get('x-user-company-id');

    if (!currentUserId) {
      return apiUnauthorized();
    }

    // Prevent self-deletion
    if (currentUserId === id) {
      return apiError('Cannot delete your own account', 400);
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('User not found');
    }

    // Check access
    if (currentUserRole !== 'SUPER_ADMIN') {
      if (existing.role === 'SUPER_ADMIN') {
        return apiForbidden('Cannot delete Super Admin users');
      }
      if (currentUserRole === 'COMPANY_ADMIN' && currentUserCompanyId !== existing.companyId) {
        return apiForbidden();
      }
    }

    // Delete user branches first
    await db.userBranch.deleteMany({
      where: { userId: id },
    });

    await db.user.delete({ where: { id } });

    await createAuditLog({
      companyId: existing.companyId || undefined,
      branchId: existing.branchId || undefined,
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      oldValues: { name: existing.name, email: existing.email, role: existing.role },
    });

    return apiSuccess({}, 'User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    return apiError('Failed to delete user', 500);
  }
}
