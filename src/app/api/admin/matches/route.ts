import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';
import { sendNotification } from '@/services/notification-service';
import { publishMatchEvent } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const matches = await prisma.match.findMany({
      include: {
        city: true,
        sport: true,
        ground: true,
        homeTeam: { select: { id: true, name: true, code: true, captainId: true } },
        awayTeam: { select: { id: true, name: true, code: true, captainId: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ matches });
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
    const { matchId, action, reason } = body; // 'APPROVE' | 'REJECT' | 'LOCK' | 'UNLOCK'

    let updateData: any = {};
    if (action === 'APPROVE') {
      updateData = {
        status: 'SCHEDULED',
        adminApproved: true,
        adminApprovedById: auth.userId,
        adminApprovedAt: new Date(),
      };
    } else if (action === 'REJECT') {
      updateData = {
        status: 'CANCELLED',
        adminApproved: false,
        notes: reason || 'Match rejected by administrator',
      };
    } else if (action === 'LOCK') {
      updateData = { isLocked: true, status: 'OFFICIAL' };
    } else if (action === 'UNLOCK') {
      updateData = { isLocked: false };
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    // Real-Time Event & Notifications
    publishMatchEvent(matchId, 'MATCH_STATUS_UPDATE', { matchId, status: updated.status, isLocked: updated.isLocked });

    if (action === 'APPROVE') {
      if (updated.homeTeam.captainId) {
        await sendNotification({
          userId: updated.homeTeam.captainId,
          title: 'Match Sanctioned & Scheduled! ⚔️',
          message: `Match fixture vs ${updated.awayTeam.name} has been sanctioned by administration and is now SCHEDULED.`,
          notificationType: 'MATCH_APPROVED',
          type: 'SUCCESS',
          linkUrl: `/matches/${updated.id}`,
        });
      }
      if (updated.awayTeam.captainId) {
        await sendNotification({
          userId: updated.awayTeam.captainId,
          title: 'Match Sanctioned & Scheduled! ⚔️',
          message: `Match fixture vs ${updated.homeTeam.name} has been sanctioned by administration and is now SCHEDULED.`,
          notificationType: 'MATCH_APPROVED',
          type: 'SUCCESS',
          linkUrl: `/matches/${updated.id}`,
        });
      }
    } else if (action === 'REJECT') {
      if (updated.homeTeam.captainId) {
        await sendNotification({
          userId: updated.homeTeam.captainId,
          title: 'Match Fixture Cancelled',
          message: `Match fixture vs ${updated.awayTeam.name} was rejected: ${reason || 'Administrative rejection'}`,
          notificationType: 'MATCH_CANCELLED',
          type: 'WARNING',
          linkUrl: `/matches/${updated.id}`,
        });
      }
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_ADMIN_UPDATED',
      entityType: 'Match',
      entityId: matchId,
      changes: { action, ...updateData },
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
