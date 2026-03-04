import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, getPaginationParams, getSortParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole } from '@prisma/client';

const dishSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  sku: z.string().optional(),
  prepTime: z.number().int().min(1).max(300).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET - List dishes
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const orderBy = getSortParams(request.nextUrl.searchParams);
    const search = request.nextUrl.searchParams.get('search');
    const companyId = request.nextUrl.searchParams.get('companyId');
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    const isActive = request.nextUrl.searchParams.get('isActive');

    // Determine company filter
    let targetCompanyId = companyId;
    if (userRole !== 'SUPER_ADMIN') {
      targetCompanyId = userCompanyId;
    }

    // Build where clause - Super Admin can see all dishes if no company specified
    const where: Record<string, unknown> = {};
    
    if (targetCompanyId && targetCompanyId !== 'all') {
      where.companyId = targetCompanyId;
    } else if (userRole !== 'SUPER_ADMIN' && userCompanyId) {
      where.companyId = userCompanyId;
    }
    // If Super Admin and no company specified, show all dishes (no companyId filter)
    
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [dishes, total] = await Promise.all([
      db.dish.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, color: true } },
          _count: { select: { checklistItems: true, qualityReports: true } },
        },
      }),
      db.dish.count({ where }),
    ]);

    return apiPaginated(dishes, page, limit, total);
  } catch (error) {
    console.error('List dishes error:', error);
    return apiError('Failed to fetch dishes', 500);
  }
}

// POST - Create dish
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const companyId = userRole === 'SUPER_ADMIN' ? body.companyId : userCompanyId;

    if (!companyId) {
      return apiError('Company ID required', 400);
    }

    const validated = dishSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Validate category belongs to same company
    if (validated.data.categoryId) {
      const category = await db.category.findUnique({
        where: { id: validated.data.categoryId },
      });
      if (!category || category.companyId !== companyId) {
        return apiError('Invalid category', 400);
      }
    }

    // Check SKU uniqueness if provided
    if (validated.data.sku) {
      const existingSku = await db.dish.findFirst({
        where: { companyId, sku: validated.data.sku },
      });
      if (existingSku) {
        return apiError('SKU already exists', 409);
      }
    }

    const dish = await db.dish.create({
      data: {
        ...validated.data,
        companyId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'Dish',
      entityId: dish.id,
      newValues: validated.data,
    });

    return apiSuccess(dish, 'Dish created successfully', 201);
  } catch (error) {
    console.error('Create dish error:', error);
    return apiError('Failed to create dish', 500);
  }
}
