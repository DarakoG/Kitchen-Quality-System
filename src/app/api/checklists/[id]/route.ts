import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, CriterionType } from '@prisma/client';

const checklistItemUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['SCORE_1_5', 'BOOLEAN', 'NUMERIC', 'TEXT']).optional(),
  isRequired: z.boolean().optional(),
  weight: z.number().min(0.1).max(10).optional(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  passingScore: z.number().optional().nullable(),
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

    if (!userId) {
      return apiUnauthorized();
    }

    const item = await db.qualityChecklistItem.findUnique({
      where: { id },
      include: { dish: { select: { id: true, name: true, companyId: true } } },
    });

    if (!item) {
      return apiNotFound('Checklist item not found');
    }

    return apiSuccess(item);
  } catch (error) {
    console.error('Get checklist item error:', error);
    return apiError('Failed to fetch checklist item', 500);
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

    const existing = await db.qualityChecklistItem.findUnique({
      where: { id },
      include: { dish: { select: { companyId: true } } },
    });

    if (!existing) {
      return apiNotFound('Checklist item not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== existing.dish.companyId) {
      return apiForbidden();
    }

    const body = await request.json();
    const validated = checklistItemUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    const item = await db.qualityChecklistItem.update({
      where: { id },
      data: {
        ...validated.data,
        type: validated.data.type as CriterionType | undefined,
      },
    });

    await createAuditLog({
      companyId: existing.dish.companyId,
      userId,
      action: 'UPDATE',
      entityType: 'QualityChecklistItem',
      entityId: id,
      oldValues: existing,
      newValues: validated.data,
    });

    return apiSuccess(item, 'Checklist item updated successfully');
  } catch (error) {
    console.error('Update checklist item error:', error);
    return apiError('Failed to update checklist item', 500);
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

    const existing = await db.qualityChecklistItem.findUnique({
      where: { id },
      include: { dish: { select: { companyId: true } } },
    });

    if (!existing) {
      return apiNotFound('Checklist item not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== existing.dish.companyId) {
      return apiForbidden();
    }

    await db.qualityChecklistItem.delete({ where: { id } });

    await createAuditLog({
      companyId: existing.dish.companyId,
      userId,
      action: 'DELETE',
      entityType: 'QualityChecklistItem',
      entityId: id,
      oldValues: existing,
    });

    return apiSuccess({}, 'Checklist item deleted successfully');
  } catch (error) {
    console.error('Delete checklist item error:', error);
    return apiError('Failed to delete checklist item', 500);
  }
}
