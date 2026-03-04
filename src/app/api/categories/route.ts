import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, getPaginationParams, getSortParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { UserRole } from '@prisma/client';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET - List categories
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const orderBy = getSortParams(request.nextUrl.searchParams, 'sortOrder', 'asc');
    const search = request.nextUrl.searchParams.get('search');
    const companyId = request.nextUrl.searchParams.get('companyId');

    // Determine company filter
    let where: Record<string, unknown> = {};
    
    if (userRole === 'SUPER_ADMIN') {
      // Super Admin can see all or filter by companyId
      if (companyId && companyId !== 'all') {
        where.companyId = companyId;
      }
      // If no companyId or 'all', show all categories
    } else {
      // Other roles can only see their company's categories
      if (!userCompanyId) {
        return apiError('Company ID required', 400);
      }
      where.companyId = userCompanyId;
    }
    
    if (search) {
      where.name = { contains: search };
    }

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { dishes: true } },
        },
      }),
      db.category.count({ where }),
    ]);

    return apiPaginated(categories, page, limit, total);
  } catch (error) {
    console.error('List categories error:', error);
    return apiError('Failed to fetch categories', 500);
  }
}

// POST - Create category
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole | null;
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const body = await request.json();
    
    // Get companyId from body or use user's company
    const companyId = userRole === 'SUPER_ADMIN' ? body.companyId : userCompanyId;
    
    if (!companyId) {
      return apiError('Company ID required. Your account may not be assigned to a company. Please contact the administrator.', 400);
    }

    const validated = categorySchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Check if category name already exists in company
    const existing = await db.category.findFirst({
      where: { companyId, name: validated.data.name },
    });

    if (existing) {
      return apiError('Category name already exists', 409);
    }

    const category = await db.category.create({
      data: {
        ...validated.data,
        companyId,
      },
    });

    await createAuditLog({
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'Category',
      entityId: category.id,
      newValues: validated.data,
    });

    return apiSuccess(category, 'Category created successfully', 201);
  } catch (error) {
    console.error('Create category error:', error);
    return apiError('Failed to create category', 500);
  }
}
