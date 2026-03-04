import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole } from '@prisma/client';

const categoryUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
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

    if (!userId) {
      return apiUnauthorized();
    }

    const category = await db.category.findUnique({
      where: { id },
      include: {
        dishes: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true },
          take: 20,
        },
        _count: { select: { dishes: true } },
      },
    });

    if (!category) {
      return apiNotFound('Category not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== category.companyId) {
      return apiForbidden();
    }

    return apiSuccess(category);
  } catch (error) {
    console.error('Get category error:', error);
    return apiError('Failed to fetch category', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Category not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== existing.companyId) {
      return apiForbidden();
    }

    const body = await request.json();
    const validated = categoryUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Check name uniqueness if changing
    if (validated.data.name && validated.data.name !== existing.name) {
      const duplicate = await db.category.findFirst({
        where: { companyId: existing.companyId, name: validated.data.name },
      });
      if (duplicate) {
        return apiError('Category name already exists', 409);
      }
    }

    const category = await db.category.update({
      where: { id },
      data: validated.data,
    });

    await createAuditLog({
      companyId: existing.companyId,
      userId,
      action: 'UPDATE',
      entityType: 'Category',
      entityId: id,
      oldValues: existing,
      newValues: validated.data,
    });

    return apiSuccess(category, 'Category updated successfully');
  } catch (error) {
    console.error('Update category error:', error);
    return apiError('Failed to update category', 500);
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

    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { dishes: true } } },
    });

    if (!existing) {
      return apiNotFound('Category not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== existing.companyId) {
      return apiForbidden();
    }

    // Check if category has dishes
    if (existing._count.dishes > 0) {
      return apiError('Cannot delete category with dishes. Remove or reassign dishes first.', 400);
    }

    await db.category.delete({ where: { id } });

    await createAuditLog({
      companyId: existing.companyId,
      userId,
      action: 'DELETE',
      entityType: 'Category',
      entityId: id,
      oldValues: existing,
    });

    return apiSuccess({}, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    return apiError('Failed to delete category', 500);
  }
}
