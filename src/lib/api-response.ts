import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function apiSuccess<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function apiError(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

export function apiPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function apiUnauthorized(message = 'Unauthorized access'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function apiForbidden(message = 'Forbidden - Insufficient permissions'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function apiNotFound(message = 'Resource not found'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function apiValidationError(errors: z.ZodError): NextResponse<ApiResponse> {
  const errorMessages = errors.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  return NextResponse.json({ success: false, error: `Validation error: ${errorMessages}` }, { status: 422 });
}

// Pagination helper
export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Sort helper
export function getSortParams(searchParams: URLSearchParams, defaultField = 'createdAt', defaultOrder: 'asc' | 'desc' = 'desc') {
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultOrder;
  return { [sortBy]: sortOrder };
}

// Date range filter helper
export function getDateRangeFilter(searchParams: URLSearchParams, field = 'createdAt') {
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate && !endDate) return undefined;

  const filter: Record<string, Date> = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);

  return { [field]: filter };
}
