import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        identifier: session.email,
        type: 'EMAIL_VERIFY',
        token,
        expiresAt: { gte: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { isEmailVerified: true },
    });

    await prisma.verificationToken.delete({ where: { id: record.id } });

    await createAuditLog({
      userId: session.userId,
      action: 'EMAIL_VERIFIED',
      entityType: 'User',
      entityId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
