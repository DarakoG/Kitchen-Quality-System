import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiPaginated, apiUnauthorized, getPaginationParams, getSortParams } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';

const companySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  logo: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.boolean().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']).optional(),
  maxBranches: z.number().int().min(1).max(1000).optional(),
});

// GET - List all companies (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return apiUnauthorized('Super Admin access required');
    }

    const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
    const orderBy = getSortParams(request.nextUrl.searchParams);
    const search = request.nextUrl.searchParams.get('search');

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { slug: { contains: search } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      db.company.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { branches: true, users: true, dishes: true } },
        },
      }),
      db.company.count({ where }),
    ]);

    return apiPaginated(companies, page, limit, total);
  } catch (error) {
    console.error('List companies error:', error);
    return apiError('Failed to fetch companies', 500);
  }
}

// POST - Create new company (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return apiUnauthorized('Super Admin access required');
    }

    const body = await request.json();
    const validated = companySchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    // Check if slug already exists
    const existingSlug = await db.company.findUnique({
      where: { slug: validated.data.slug },
    });

    if (existingSlug) {
      return apiError('Company with this slug already exists', 409);
    }

    const company = await db.company.create({
      data: validated.data,
    });

    await createAuditLog({
      userId,
      action: 'CREATE',
      entityType: 'Company',
      entityId: company.id,
      newValues: validated.data,
    });

    return apiSuccess(company, 'Company created successfully', 201);
  } catch (error) {
    console.error('Create company error:', error);
    return apiError('Failed to create company', 500);
  }
}
