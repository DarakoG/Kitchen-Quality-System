import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, CriterionType } from '@prisma/client';

const checklistItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  type: z.enum(['SCORE_1_5', 'BOOLEAN', 'NUMERIC', 'TEXT']),
  isRequired: z.boolean().optional(),
  weight: z.number().min(0.1).max(10).optional(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  passingScore: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET - List checklist items for a dish
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const dishId = request.nextUrl.searchParams.get('dishId');

    if (!userId) {
      return apiUnauthorized();
    }

    if (!dishId) {
      return apiError('Dish ID required', 400);
    }

    const items = await db.qualityChecklistItem.findMany({
      where: { dishId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return apiSuccess(items);
  } catch (error) {
    console.error('List checklist items error:', error);
    return apiError('Failed to fetch checklist items', 500);
  }
}

// POST - Create checklist item
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (!userCompanyId && userRole !== 'SUPER_ADMIN') {
      return apiForbidden();
    }

    const body = await request.json();
    const { dishId, ...itemData } = body;

    if (!dishId) {
      return apiError('Dish ID required', 400);
    }

    // Verify dish access
    const dish = await db.dish.findUnique({ where: { id: dishId } });
    if (!dish) {
      return apiError('Dish not found', 404);
    }

    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== dish.companyId) {
      return apiForbidden();
    }

    const validated = checklistItemSchema.safeParse(itemData);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Validate type-specific fields
    if (validated.data.type === 'NUMERIC') {
      if (validated.data.minValue === undefined || validated.data.minValue === null || 
          validated.data.maxValue === undefined || validated.data.maxValue === null) {
        return apiError('NUMERIC type requires minValue and maxValue', 400);
      }
      if (validated.data.minValue >= validated.data.maxValue) {
        return apiError('minValue must be less than maxValue', 400);
      }
    } else {
      // For non-NUMERIC types, ensure minValue and maxValue are not set
      validated.data.minValue = undefined;
      validated.data.maxValue = undefined;
    }

    const item = await db.qualityChecklistItem.create({
      data: {
        ...validated.data,
        dishId,
        type: validated.data.type as CriterionType,
      },
    });

    await createAuditLog({
      companyId: dish.companyId,
      userId,
      action: 'CREATE',
      entityType: 'QualityChecklistItem',
      entityId: item.id,
      newValues: validated.data,
    });

    return apiSuccess(item, 'Checklist item created successfully', 201);
  } catch (error) {
    console.error('Create checklist item error:', error);
    return apiError('Failed to create checklist item', 500);
  }
}
