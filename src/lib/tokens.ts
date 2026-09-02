import crypto from 'crypto';
import { prisma } from './prisma';

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateNumericCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate previous unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function createVerificationToken(identifier: string, type: 'EMAIL_VERIFY' | 'PHONE_VERIFY'): Promise<string> {
  await prisma.verificationToken.deleteMany({
    where: { identifier, type },
  });

  const token = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 mins

  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      type,
      expiresAt,
    },
  });

  return token;
}
