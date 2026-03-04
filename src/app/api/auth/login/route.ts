import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateUser } from '@/lib/auth';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return apiValidationError(validated.error);
    }

    const { email, password } = validated.data;
    const user = await authenticateUser(email, password);

    if (!user) {
      return apiError('Invalid email or password', 401);
    }

    // Create audit log for login
    await createAuditLog({
      companyId: user.companyId,
      branchId: user.branchId,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      newValues: { email: user.email, loginTime: new Date().toISOString() },
    });

    return apiSuccess({ user }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return apiError('An error occurred during login', 500);
  }
}
