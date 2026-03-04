import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, CriterionType } from '@prisma/client';

const templateItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  type: z.enum(['SCORE_1_5', 'BOOLEAN', 'NUMERIC', 'TEXT']),
  isRequired: z.boolean().optional(),
  weight: z.number().min(0.1).max(10).optional(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  passingScore: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const templateUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  items: z.array(templateItemSchema).min(1, 'At least one item is required').optional(),
});

// GET - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const template = await db.checklistTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) {
      return apiNotFound('Template not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && template.companyId !== userCompanyId) {
      return apiForbidden();
    }

    return apiSuccess(template);
  } catch (error) {
    console.error('Get template error:', error);
    return apiError('Failed to fetch template', 500);
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existingTemplate = await db.checklistTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return apiNotFound('Template not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && existingTemplate.companyId !== userCompanyId) {
      return apiForbidden();
    }

    const body = await request.json();
    const { items, ...templateData } = body;

    // Validate template data
    const validated = templateUpdateSchema.safeParse(body);
    if (!validated.success) {
      return apiError('Validation failed', 400);
    }

    const companyId = existingTemplate.companyId;

    // If setting as default, remove default from other templates
    if (validated.data.isDefault) {
      await db.checklistTemplate.updateMany({
        where: { companyId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Update template and items
    const updateData: any = {};
    if (templateData.name !== undefined) updateData.name = templateData.name;
    if (templateData.description !== undefined) updateData.description = templateData.description;
    if (templateData.isDefault !== undefined) updateData.isDefault = templateData.isDefault;

    let template;
    if (items && Array.isArray(items)) {
      // Delete existing items and create new ones
      await db.checklistTemplateItem.deleteMany({
        where: { templateId: id },
      });

      template = await db.checklistTemplate.update({
        where: { id },
        data: {
          ...updateData,
          items: {
            create: items.map((item: any, index: number) => ({
              name: item.name,
              description: item.description,
              type: item.type as CriterionType,
              isRequired: item.isRequired ?? true,
              weight: item.weight ?? 1.0,
              minValue: item.minValue,
              maxValue: item.maxValue,
              passingScore: item.passingScore,
              sortOrder: index,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    } else {
      template = await db.checklistTemplate.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
        },
      });
    }

    await createAuditLog({
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'ChecklistTemplate',
      entityId: id,
      newValues: validated.data,
    });

    return apiSuccess(template, 'Template updated successfully');
  } catch (error) {
    console.error('Update template error:', error);
    return apiError('Failed to update template', 500);
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const existingTemplate = await db.checklistTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return apiNotFound('Template not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && existingTemplate.companyId !== userCompanyId) {
      return apiForbidden();
    }

    // Delete template items first (cascade should handle this, but let's be explicit)
    await db.checklistTemplateItem.deleteMany({
      where: { templateId: id },
    });

    // Delete template
    await db.checklistTemplate.delete({
      where: { id },
    });

    await createAuditLog({
      companyId: existingTemplate.companyId,
      userId,
      action: 'DELETE',
      entityType: 'ChecklistTemplate',
      entityId: id,
      oldValues: { name: existingTemplate.name },
    });

    return apiSuccess(null, 'Template deleted successfully');
  } catch (error) {
    console.error('Delete template error:', error);
    return apiError('Failed to delete template', 500);
  }
}
