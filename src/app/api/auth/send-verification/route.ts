import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createVerificationToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const code = await createVerificationToken(session.email, 'EMAIL_VERIFY');

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${session.email}`,
      code, // returned in response for testing
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send verification' }, { status: 500 });
  }
}
