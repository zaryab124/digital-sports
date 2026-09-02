import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/auth/register/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const { email, password, fullName, phone, cnic, homeCityId, initialRole } = validated.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const city = await prisma.city.findUnique({ where: { id: homeCityId } });
    if (!city) {
      return NextResponse.json({ error: 'Selected city does not exist' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { code: initialRole } });
    if (!role) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        cnic,
        homeCityId,
        userRoles: {
          create: [{ roleId: role.id, cityId: homeCityId }],
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (initialRole === 'PLAYER' || initialRole === 'CAPTAIN') {
      await prisma.playerProfile.create({
        data: { userId: user.id },
      });
    }
    if (initialRole === 'CAPTAIN') {
      await prisma.captainProfile.create({
        data: { userId: user.id },
      });
    }
    if (initialRole === 'OFFICIAL') {
      await prisma.officialProfile.create({
        data: { userId: user.id },
      });
    }
    if (initialRole === 'FAN') {
      await prisma.fanProfile.create({
        data: { userId: user.id, favoriteCityId: homeCityId },
      });
    }

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
      changes: { role: initialRole, city: city.name },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        homeCityId: user.homeCityId,
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
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
""")
