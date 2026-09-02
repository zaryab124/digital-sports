const fs = require('fs');

const updatedTeamsRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';
import { sendNotification } from '@/services/notification-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const cityId = searchParams.get('cityId');

    const where: any = {};
    if (status) where.status = status;
    if (cityId) where.cityId = cityId;

    const teams = await prisma.team.findMany({
      where,
      include: {
        city: true,
        sport: true,
        captain: { select: { id: true, fullName: true, email: true, phone: true } },
        members: { include: { player: { select: { fullName: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, action, reason } = body; // action: 'APPROVE' | 'REJECT' | 'SUSPEND'

    const targetStatus = action === 'APPROVE' ? 'ACTIVE' : action === 'REJECT' ? 'REJECTED' : 'INACTIVE';

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        status: targetStatus,
      },
      include: {
        captain: true,
      },
    });

    // Real-Time Notification to Captain
    if (updated.captainId) {
      if (action === 'APPROVE') {
        await sendNotification({
          userId: updated.captainId,
          title: 'Squad Registration Approved! 🎉',
          message: \`Congratulations! Your squad "\${updated.name}" has been officially approved and activated.\`,
          notificationType: 'TEAM_APPROVED',
          type: 'SUCCESS',
          linkUrl: \`/teams/\${updated.id}\`,
        });
      } else if (action === 'REJECT') {
        await sendNotification({
          userId: updated.captainId,
          title: 'Squad Registration Update',
          message: \`Your squad "\${updated.name}" registration was rejected: \${reason || 'Please contact administration.'}\`,
          notificationType: 'TEAM_REJECTED',
          type: 'WARNING',
          linkUrl: \`/teams/\${updated.id}\`,
        });
      }
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_STATUS_ADMIN_UPDATED',
      entityType: 'Team',
      entityId: teamId,
      changes: { status: targetStatus, reason },
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/admin/teams/route.ts', updatedTeamsRoute.trim() + '\n', 'utf8');
console.log('[OK] Updated src/app/api/admin/teams/route.ts with notifications');
