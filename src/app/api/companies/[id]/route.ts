import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiValidationError, apiNotFound, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';

const companyUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  logo: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']).optional(),
  maxBranches: z.number().int().min(1).max(1000).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single company
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== id) {
      return apiForbidden('Cannot access this company');
    }

    const company = await db.company.findUnique({
      where: { id },
      include: {
        branches: {
          where: { isActive: true },
          select: { id: true, name: true, code: true, city: true },
        },
        _count: { select: { branches: true, users: true, dishes: true, categories: true } },
      },
    });

    if (!company) {
      return apiNotFound('Company not found');
    }

    return apiSuccess(company);
  } catch (error) {
    console.error('Get company error:', error);
    return apiError('Failed to fetch company', 500);
  }
}

// PUT - Update company
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userCompanyId = request.headers.get('x-user-company-id');

    if (!userId) {
      return apiUnauthorized();
    }

    if (userRole !== 'SUPER_ADMIN' && userCompanyId !== id) {
      return apiForbidden();
    }

    const existing = await db.company.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Company not found');
    }

    const body = await request.json();
    const validated = companyUpdateSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    const company = await db.company.update({
      where: { id },
      data: validated.data,
    });

    await createAuditLog({
      companyId: id,
      userId,
      action: 'UPDATE',
      entityType: 'Company',
      entityId: id,
      oldValues: existing,
      newValues: validated.data,
    });

    return apiSuccess(company, 'Company updated successfully');
  } catch (error) {
    console.error('Update company error:', error);
    return apiError('Failed to update company', 500);
  }
}

// DELETE - Delete company (Super Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || userRole !== 'SUPER_ADMIN') {
      return apiUnauthorized('Super Admin access required');
    }

    const existing = await db.company.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Company not found');
    }

    await db.company.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: 'DELETE',
      entityType: 'Company',
      entityId: id,
      oldValues: existing,
    });

    return apiSuccess({}, 'Company deleted successfully');
  } catch (error) {
    console.error('Delete company error:', error);
    return apiError('Failed to delete company', 500);
  }
}
