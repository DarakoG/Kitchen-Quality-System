import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { CriterionType } from '@prisma/client';

// POST - Apply template to dishes
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { templateId, dishIds } = body;

    if (!templateId || !dishIds || !Array.isArray(dishIds) || dishIds.length === 0) {
      return apiError('Template ID and dish IDs are required', 400);
    }

    // Get template with items
    const template = await db.checklistTemplate.findUnique({
      where: { id: templateId },
      include: { items: true },
    });

    if (!template) {
      return apiError('Template not found', 404);
    }

    // Verify access to template's company
    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== template.companyId) {
      return apiForbidden();
    }

    // Get all dishes and verify access
    const dishes = await db.dish.findMany({
      where: { id: { in: dishIds } },
    });

    // Filter dishes that belong to the same company as template
    const validDishes = dishes.filter(d => d.companyId === template.companyId);

    if (validDishes.length === 0) {
      return apiError('No valid dishes found for this template', 400);
    }

    // Get max sortOrder for each dish
    const existingItems = await db.qualityChecklistItem.groupBy({
      by: ['dishId'],
      where: { dishId: { in: validDishes.map(d => d.id) } },
      _max: { sortOrder: true },
    });

    const sortOrderMap = new Map(
      existingItems.map(item => [item.dishId, item._max.sortOrder || 0])
    );

    // Create checklist items for each dish
    const createPromises: Promise<any>[] = [];
    
    for (const dish of validDishes) {
      const currentMaxSort = sortOrderMap.get(dish.id) || -1;
      
      for (let i = 0; i < template.items.length; i++) {
        const templateItem = template.items[i];
        createPromises.push(
          db.qualityChecklistItem.create({
            data: {
              dishId: dish.id,
              name: templateItem.name,
              description: templateItem.description,
              type: templateItem.type as CriterionType,
              isRequired: templateItem.isRequired,
              weight: templateItem.weight,
              minValue: templateItem.minValue,
              maxValue: templateItem.maxValue,
              passingScore: templateItem.passingScore,
              sortOrder: currentMaxSort + 1 + i,
            },
          })
        );
      }
    }

    await Promise.all(createPromises);

    await createAuditLog({
      companyId: template.companyId,
      userId,
      action: 'APPLY_TEMPLATE',
      entityType: 'ChecklistTemplate',
      entityId: templateId,
      newValues: { templateName: template.name, dishesCount: validDishes.length, itemsPerDish: template.items.length },
    });

    return apiSuccess({
      appliedTo: validDishes.length,
      itemsPerDish: template.items.length,
      totalItemsCreated: validDishes.length * template.items.length,
    }, 'Template applied successfully');
  } catch (error) {
    console.error('Apply template error:', error);
    return apiError('Failed to apply template', 500);
  }
}
