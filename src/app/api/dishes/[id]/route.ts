import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, CriterionType } from '@prisma/client';

const dishUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  sku: z.string().optional().nullable(),
  prepTime: z.number().int().min(1).max(300).optional().nullable(),
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

    const dish = await db.dish.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, color: true } },
        checklistItems: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { checklistItems: true, qualityReports: true, incidents: true } },
      },
    });

    if (!dish) {
      return apiNotFound('Dish not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== dish.companyId) {
      return apiForbidden();
    }

    return apiSuccess(dish);
  } catch (error) {
    console.error('Get dish error:', error);
    return apiError('Failed to fetch dish', 500);
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

    const existing = await db.dish.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Dish not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== existing.companyId) {
      return apiForbidden();
    }

    const body = await request.json();
    const validated = dishUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Validate category if changing
    if (validated.data.categoryId) {
      const category = await db.category.findUnique({
        where: { id: validated.data.categoryId },
      });
      if (!category || category.companyId !== existing.companyId) {
        return apiError('Invalid category', 400);
      }
    }

    // Check SKU uniqueness if changing
    if (validated.data.sku && validated.data.sku !== existing.sku) {
      const existingSku = await db.dish.findFirst({
        where: { companyId: existing.companyId, sku: validated.data.sku },
      });
      if (existingSku) {
        return apiError('SKU already exists', 409);
      }
    }

    const dish = await db.dish.update({
      where: { id },
      data: validated.data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      companyId: existing.companyId,
      userId,
      action: 'UPDATE',
      entityType: 'Dish',
      entityId: id,
      oldValues: existing,
      newValues: validated.data,
    });

    return apiSuccess(dish, 'Dish updated successfully');
  } catch (error) {
    console.error('Update dish error:', error);
    return apiError('Failed to update dish', 500);
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

    const existing = await db.dish.findUnique({
      where: { id },
      include: { _count: { select: { qualityReports: true } } },
    });

    if (!existing) {
      return apiNotFound('Dish not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== existing.companyId) {
      return apiForbidden();
    }

    // Check for quality reports
    if (existing._count.qualityReports > 0) {
      // Soft delete instead of hard delete
      await db.dish.update({
        where: { id },
        data: { isActive: false },
      });
      return apiSuccess({}, 'Dish deactivated (has quality reports history)');
    }

    await db.dish.delete({ where: { id } });

    await createAuditLog({
      companyId: existing.companyId,
      userId,
      action: 'DELETE',
      entityType: 'Dish',
      entityId: id,
      oldValues: existing,
    });

    return apiSuccess({}, 'Dish deleted successfully');
  } catch (error) {
    console.error('Delete dish error:', error);
    return apiError('Failed to delete dish', 500);
  }
}
