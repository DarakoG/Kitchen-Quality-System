import { NextRequest } from 'next/server';
import { apiSuccess, apiUnauthorized } from '@/lib/api-response';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd verify a JWT token or session cookie
    // For this demo, we'll use a header-based approach
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return apiUnauthorized('Not authenticated');
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        branchId: true,
        avatar: true,
        phone: true,
        isActive: true,
        company: {
          select: { id: true, name: true, slug: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      return apiUnauthorized('User not found');
    }

    return apiSuccess({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    return apiUnauthorized('Authentication failed');
  }
}
