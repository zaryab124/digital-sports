import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (session) {
    await createAuditLog({
      userId: session.userId,
      action: 'USER_LOGGED_OUT',
      entityType: 'User',
      entityId: session.userId,
    });
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  response.cookies.delete('auth_token');
  return response;
}
