import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
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

    const jampur = await prisma.city.upsert({
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

    const superAdminRole = await prisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER ADMIN', code: 'SUPER_ADMIN', description: 'Global Super Administrator' },
    });

    const passwordHash = await hashPassword('Admin@Sports2026!');

    const admin = await prisma.user.upsert({
      where: { email: 'admin@sports.pk' },
      update: {
        status: 'ACTIVE',
        isEmailVerified: true,
      },
      create: {
        email: 'admin@sports.pk',
        passwordHash,
        fullName: 'System Administrator',
        phone: '+92 300 0000000',
        homeCityId: jampur.id,
        isEmailVerified: true,
        status: 'ACTIVE',
        adminProfile: {
          create: {
            designation: 'Chief Administrator & Platform Commissioner',
            department: 'South Punjab Digital Sports Platform',
            officeContact: '+92 300 0000000',
          },
        },
      },
    });

    await prisma.userRole.upsert({
      where: { id: 'master-super-admin-role' },
      update: {},
      create: {
        id: 'master-super-admin-role',
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    });

    const tokenPayload = {
      userId: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      homeCityId: admin.homeCityId,
      roles: [{ roleCode: 'SUPER_ADMIN' }],
    };

    const token = signToken(tokenPayload);

    await createAuditLog({
      userId: admin.id,
      action: 'ADMIN_QUICK_LOGIN',
      entityType: 'User',
      entityId: admin.id,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Master Admin Access Granted',
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
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
    console.error('Quick admin login error:', error);
    return NextResponse.json({ error: error.message || 'Quick login failed' }, { status: 500 });
  }
}
