import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, targetCityId, targetRole } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const where: any = {};
    if (targetCityId) where.homeCityId = targetCityId;

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    const notificationsData = users.map((u) => ({
      userId: u.id,
      title,
      message,
      type: type || 'INFO',
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'BROADCAST_NOTIFICATION_SENT',
      entityType: 'Notification',
      entityId: 'SYSTEM_BROADCAST',
      changes: { title, count: users.length, targetCityId, targetRole },
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast delivered to ${users.length} users successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
