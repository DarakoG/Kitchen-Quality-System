import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  return apiSuccess({}, 'Logout successful');
}
