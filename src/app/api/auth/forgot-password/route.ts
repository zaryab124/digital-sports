import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validations';
import { createPasswordResetToken } from '@/lib/tokens';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = forgotPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { email } = validated.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been generated.',
      });
    }

    const resetToken = await createPasswordResetToken(user.id);

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset token generated successfully.',
      resetToken, // Returned for dev/testing verification
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process password reset' }, { status: 500 });
  }
}
