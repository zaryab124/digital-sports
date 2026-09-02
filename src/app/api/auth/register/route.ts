import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { createVerificationToken } from '@/lib/tokens';
import { createAuditLog } from '@/services/audit-service';

async function ensureRoles() {
  const roleCodes = [
    'SUPER_ADMIN',
    'REGIONAL_ADMIN',
    'CITY_ADMIN',
    'SPORTS_ADMIN',
    'OFFICIAL',
    'CAPTAIN',
    'PLAYER',
    'FAN',
  ];

  for (const code of roleCodes) {
    await prisma.role.upsert({
      where: { code },
      update: {},
      create: {
        name: code.replace(/_/g, ' '),
        code,
        description: `${code.replace(/_/g, ' ')} Role`,
      },
    });
  }
}

async function resolveCity(homeCityId: string) {
  let city = await prisma.city.findFirst({
    where: {
      OR: [
        { id: homeCityId },
        { code: homeCityId },
        { slug: homeCityId },
        { slug: homeCityId.replace('-city', '') },
        { name: { contains: homeCityId.replace('-city', ''), mode: 'insensitive' } },
      ],
    },
  });

  if (!city) {
    // Check if province & region exist
    const punjab = await prisma.province.upsert({
      where: { code: 'PUNJAB' },
      update: {},
      create: { name: 'Punjab', code: 'PUNJAB' },
    });

    const southPunjab = await prisma.region.upsert({
      where: { code: 'SOUTH_PUNJAB' },
      update: {},
      create: { name: 'South Punjab', code: 'SOUTH_PUNJAB', provinceId: punjab.id },
    });

    // Create default Jampur city if none exists
    city = await prisma.city.upsert({
      where: { code: 'JAM' },
      update: { isActive: true },
      create: {
        name: 'Jampur',
        slug: 'jampur',
        code: 'JAM',
        description: 'Historical sports hub.',
        regionId: southPunjab.id,
        status: 'ACTIVE',
        isActive: true,
      },
    });
  }

  return city;
}

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
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 400 });
    }

    // Ensure all system roles exist in DB
    await ensureRoles();

    // Check city with flexible resolution
    const city = await resolveCity(homeCityId);
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
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        phone: phone || undefined,
        cnic: cnic || undefined,
        homeCityId: city.id,
        avatarUrl: avatarUrl || undefined,
        status: 'ACTIVE',
        isEmailVerified: true,
        userRoles: {
          create: [{ roleId: role.id, cityId: city.id, sportId: primarySportId }],
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
          favoriteCityId: city.id,
          favoriteSportId: primarySportId || undefined,
        },
      });
    }

    if (initialRole === 'SUPER_ADMIN' || initialRole === 'CITY_ADMIN') {
      await prisma.adminProfile.create({
        data: {
          userId: user.id,
          designation: initialRole === 'SUPER_ADMIN' ? 'Chief Sports Commissioner' : `${city.name} Sports Officer`,
          department: 'South Punjab Sports Board',
        },
      });
    }

    // Generate Verification Token
    const verifyToken = await createVerificationToken(user.email, 'EMAIL_VERIFY');

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
      verificationCode: verifyToken,
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
