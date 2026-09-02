import { NextRequest, NextResponse } from 'next/server';
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
