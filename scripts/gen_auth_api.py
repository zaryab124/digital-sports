import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote API route:', path)

# 1. Register Route
write_file('src/app/api/auth/register/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { createVerificationToken } from '@/lib/tokens';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const {
      email,
      password,
      fullName,
      phone,
      cnic,
      homeCityId,
      initialRole,
      primarySportId,
      avatarUrl,
      jerseyNumber,
      playingPosition,
      battingStyle,
      bowlingStyle,
      officialType,
      badgeNumber,
      experienceYears,
    } = validated.data;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 400 });
    }

    // Check city
    const city = await prisma.city.findUnique({ where: { id: homeCityId } });
    if (!city) {
      return NextResponse.json({ error: 'Selected home city does not exist.' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { code: initialRole } });
    if (!role) {
      return NextResponse.json({ error: 'Invalid initial role.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Create User with Role Assignment
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        cnic,
        homeCityId,
        avatarUrl: avatarUrl || undefined,
        userRoles: {
          create: [{ roleId: role.id, cityId: homeCityId, sportId: primarySportId }],
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    // Create Role-Specific Profile Structures
    if (initialRole === 'PLAYER' || initialRole === 'CAPTAIN') {
      await prisma.playerProfile.create({
        data: {
          userId: user.id,
          primarySportId: primarySportId || undefined,
          jerseyNumber: jerseyNumber || undefined,
          position: playingPosition || undefined,
          battingStyle: battingStyle || undefined,
          bowlingStyle: bowlingStyle || undefined,
          performanceCategory: 'DEVELOPING',
        },
      });
    }

    if (initialRole === 'CAPTAIN') {
      await prisma.captainProfile.create({
        data: {
          userId: user.id,
          experienceYears: experienceYears || 1,
          sportsManagedJson: primarySportId ? JSON.stringify([primarySportId]) : '[]',
        },
      });
    }

    if (initialRole === 'OFFICIAL') {
      await prisma.officialProfile.create({
        data: {
          userId: user.id,
          officialType: officialType || 'REFEREE',
          badgeNumber: badgeNumber || undefined,
          licenseLevel: 'REGIONAL',
          experienceYears: experienceYears || 1,
          isVerifiedByAdmin: false,
        },
      });
    }

    if (initialRole === 'FAN') {
      await prisma.fanProfile.create({
        data: {
          userId: user.id,
          favoriteCityId: homeCityId,
          favoriteSportId: primarySportId || undefined,
        },
      });
    }

    // Generate Verification Token
    const verifyToken = await createVerificationToken(email, 'EMAIL_VERIFY');

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      homeCityId: user.homeCityId,
      roles: user.userRoles.map((ur) => ({
        roleCode: ur.role.code,
        regionId: ur.regionId,
        cityId: ur.cityId,
        sportId: ur.sportId,
      })),
    };

    const token = signToken(tokenPayload);

    await createAuditLog({
      userId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      changes: { role: initialRole, city: city.name, sportId: primarySportId },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Welcome to Sports Community.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        homeCityId: user.homeCityId,
        roles: tokenPayload.roles,
      },
      verificationCode: verifyToken, // Provided in development response for testing
      token,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
""")

# 2. Login Route
write_file('src/app/api/auth/login/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const { email, password } = validated.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        homeCity: true,
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Your account has been suspended by administration.' }, { status: 403 });
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      homeCityId: user.homeCityId,
      roles: user.userRoles.map((ur) => ({
        roleCode: ur.role.code,
        regionId: ur.regionId,
        cityId: ur.cityId,
        sportId: ur.sportId,
      })),
    };

    const token = signToken(tokenPayload);

    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGGED_IN',
      entityType: 'User',
      entityId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        homeCityId: user.homeCityId,
        homeCityName: user.homeCity?.name,
        roles: tokenPayload.roles,
      },
      token,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
""")

# 3. Logout Route
write_file('src/app/api/auth/logout/route.ts', """import { NextRequest, NextResponse } from 'next/server';
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
""")

# 4. Forgot Password Route
write_file('src/app/api/auth/forgot-password/route.ts', """import { NextRequest, NextResponse } from 'next/server';
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
""")

# 5. Reset Password Route
write_file('src/app/api/auth/reset-password/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = resetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const { token, newPassword } = validated.data;

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This password reset token is invalid or has expired.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    await createAuditLog({
      userId: resetRecord.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: resetRecord.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 500 });
  }
}
""")

# 6. Change Password Route
write_file('src/app/api/auth/change-password/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession, verifyPassword, hashPassword } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const validated = changePasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const { currentPassword, newPassword } = validated.data;

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const match = await verifyPassword(currentPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Current password does not match.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to change password' }, { status: 500 });
  }
}
""")

# 7. Send Verification Token
write_file('src/app/api/auth/send-verification/route.ts', """import { NextRequest, NextResponse } from 'next/server';
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
""")

# 8. Verify Email
write_file('src/app/api/auth/verify-email/route.ts', """import { NextRequest, NextResponse } from 'next/server';
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
""")

# 9. User Composite Profile (GET & PUT)
write_file('src/app/api/users/profile/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        homeCity: { include: { region: true } },
        userRoles: { include: { role: true, city: true, sport: true } },
        playerProfile: { include: { primarySport: true, statistics: { include: { sport: true } } } },
        captainProfile: true,
        officialProfile: true,
        fanProfile: true,
        adminProfile: true,
        teamMemberships: {
          where: { status: 'ACTIVE' },
          include: { team: { include: { sport: true, city: true } } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const {
      fullName,
      phone,
      cnic,
      avatarUrl,
      homeCityId,
      playerProfile,
      captainProfile,
      officialProfile,
      fanProfile,
    } = validated.data;

    // 1. Update Core User Info (CRITICAL: roles are NEVER updated from here)
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName: fullName || undefined,
        phone: phone !== undefined ? phone : undefined,
        cnic: cnic !== undefined ? cnic : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        homeCityId: homeCityId || undefined,
      },
      include: {
        homeCity: true,
        userRoles: { include: { role: true } },
      },
    });

    // 2. Update Player Profile if provided
    if (playerProfile) {
      await prisma.playerProfile.upsert({
        where: { userId: session.userId },
        update: {
          primarySportId: playerProfile.primarySportId,
          secondarySportsJson: playerProfile.secondarySports ? JSON.stringify(playerProfile.secondarySports) : undefined,
          jerseyNumber: playerProfile.jerseyNumber,
          position: playerProfile.position,
          battingStyle: playerProfile.battingStyle,
          bowlingStyle: playerProfile.bowlingStyle,
          dominantFoot: playerProfile.dominantFoot,
          heightCm: playerProfile.heightCm,
          weightKg: playerProfile.weightKg,
          bio: playerProfile.bio,
        },
        create: {
          userId: session.userId,
          primarySportId: playerProfile.primarySportId,
          secondarySportsJson: playerProfile.secondarySports ? JSON.stringify(playerProfile.secondarySports) : undefined,
          jerseyNumber: playerProfile.jerseyNumber,
          position: playerProfile.position,
          battingStyle: playerProfile.battingStyle,
          bowlingStyle: playerProfile.bowlingStyle,
          dominantFoot: playerProfile.dominantFoot,
          heightCm: playerProfile.heightCm,
          weightKg: playerProfile.weightKg,
          bio: playerProfile.bio,
        },
      });
    }

    // 3. Update Captain Profile if provided
    if (captainProfile) {
      await prisma.captainProfile.upsert({
        where: { userId: session.userId },
        update: {
          experienceYears: captainProfile.experienceYears,
          certification: captainProfile.certification,
          bio: captainProfile.bio,
        },
        create: {
          userId: session.userId,
          experienceYears: captainProfile.experienceYears || 1,
          certification: captainProfile.certification,
          bio: captainProfile.bio,
        },
      });
    }

    // 4. Update Official Profile if provided
    if (officialProfile) {
      await prisma.officialProfile.upsert({
        where: { userId: session.userId },
        update: {
          officialType: officialProfile.officialType,
          badgeNumber: officialProfile.badgeNumber,
          licenseLevel: officialProfile.licenseLevel,
          experienceYears: officialProfile.experienceYears,
          bio: officialProfile.bio,
        },
        create: {
          userId: session.userId,
          officialType: officialProfile.officialType || 'REFEREE',
          badgeNumber: officialProfile.badgeNumber,
          licenseLevel: officialProfile.licenseLevel || 'REGIONAL',
          experienceYears: officialProfile.experienceYears || 1,
          bio: officialProfile.bio,
        },
      });
    }

    // 5. Update Fan Profile if provided
    if (fanProfile) {
      await prisma.fanProfile.upsert({
        where: { userId: session.userId },
        update: {
          favoriteCityId: fanProfile.favoriteCityId,
          favoriteSportId: fanProfile.favoriteSportId,
          cheerBio: fanProfile.cheerBio,
        },
        create: {
          userId: session.userId,
          favoriteCityId: fanProfile.favoriteCityId,
          favoriteSportId: fanProfile.favoriteSportId,
          cheerBio: fanProfile.cheerBio,
        },
      });
    }

    await createAuditLog({
      userId: session.userId,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: session.userId,
      changes: { fullName, homeCityId },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
""")

# 10. Role Management Endpoint (Admin-Only with City/Region Scoping)
write_file('src/app/api/users/roles/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { hasAnyRole, RoleCode, canManageCity } from '@/lib/rbac';
import { assignRoleSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasAnyRole(session, [RoleCode.SUPER_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required to assign roles.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = assignRoleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const { targetUserId, roleCode, cityId, regionId, sportId } = validated.data;

    // City-Level Authorization Check
    if (cityId) {
      const authorized = await canManageCity(session, cityId);
      if (!authorized) {
        return NextResponse.json({
          error: 'Forbidden. You do not have administrative authority over the specified city.',
        }, { status: 403 });
      }
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      return NextResponse.json({ error: 'Specified role not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const existing = await prisma.userRole.findFirst({
      where: {
        userId: targetUserId,
        roleId: role.id,
        cityId: cityId || null,
        regionId: regionId || null,
        sportId: sportId || null,
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'User already has this role in the specified scope.' });
    }

    const userRole = await prisma.userRole.create({
      data: {
        userId: targetUserId,
        roleId: role.id,
        cityId: cityId || undefined,
        regionId: regionId || undefined,
        sportId: sportId || undefined,
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'ROLE_ASSIGNED',
      entityType: 'UserRole',
      entityId: userRole.id,
      changes: { targetUserId, roleCode, cityId, regionId, sportId },
    });

    return NextResponse.json({
      success: true,
      message: `Role ${roleCode} assigned successfully.`,
      userRole,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to assign role' }, { status: 500 });
  }
}
""")

print('[DONE] Auth API routes written.')
