import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const users = await prisma.user.findMany({
      include: {
        homeCity: true,
        userRoles: { include: { role: true, city: true, region: true, sport: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const roles = await prisma.role.findMany();

    return NextResponse.json({ users, roles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const { userId, roleCode, cityId, regionId, sportId } = body;

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        cityId,
        regionId,
        sportId,
      },
      include: { role: true },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'USER_ROLE_ASSIGNED',
      entityType: 'UserRole',
      entityId: userRole.id,
      changes: { userId, roleCode, cityId, regionId, sportId },
    });

    return NextResponse.json({ success: true, userRole }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
