import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, apiForbidden, getPaginationParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole, CriterionType } from '@prisma/client';

const templateItemSchema = z.object({
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

const templateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  items: z.array(templateItemSchema).min(1, 'At least one item is required'),
});

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const companyId = request.nextUrl.searchParams.get('companyId');

    // Determine company filter
    let targetCompanyId = companyId;
    if (userRole !== 'SUPER_ADMIN') {
      targetCompanyId = userCompanyId;
    }

    if (!targetCompanyId) {
      return apiSuccess([]);
    }

    const [templates, total] = await Promise.all([
      db.checklistTemplate.findMany({
        where: { companyId: targetCompanyId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      db.checklistTemplate.count({
        where: { companyId: targetCompanyId },
      }),
    ]);

    return apiPaginated(templates, page, limit, total);
  } catch (error) {
    console.error('List templates error:', error);
    return apiError('Failed to fetch templates', 500);
  }
}

// POST - Create template
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
    const { items, ...templateData } = body;

    if (!items || items.length === 0) {
      return apiError('At least one item is required', 400);
    }

    const validated = templateSchema.safeParse(templateData);

    if (!validated.success) {
    return apiValidationError(validated.error);
    }

    const companyId = userRole === 'SUPER_ADMIN' ? body.companyId : userCompanyId;

    if (!companyId) {
      return apiError('Company ID required', 400);
    }

    // If setting as default, remove default from other templates
    if (validated.data.isDefault) {
    await db.checklistTemplate.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false },
    });
  }

    const template = await db.checklistTemplate.create({
    data: {
      companyId,
      name: validated.data.name,
      description: validated.data.description,
      isDefault: validated.data.isDefault || false,
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

  await createAuditLog({
    companyId,
    userId,
    action: 'CREATE',
    entityType: 'ChecklistTemplate',
    entityId: template.id,
    newValues: validated.data,
  });

  return apiSuccess(template, 'Template created successfully', 201);
  } catch (error) {
    console.error('Create template error:', error);
    return apiError('Failed to create template', 500);
  }
}
