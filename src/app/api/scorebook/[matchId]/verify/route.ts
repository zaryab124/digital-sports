import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canVerifyMatchResult } from '@/lib/rbac';
import { processMatchFinalStatistics } from '@/services/stats-engine';
import { createAuditLog } from '@/services/audit-service';
import { sendNotification } from '@/services/notification-service';
import { publishMatchEvent, publishGlobalEvent, publishCityEvent } from '@/lib/realtime';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: {
        scorebook: true,
        homeTeam: { select: { id: true, name: true, captainId: true } },
        awayTeam: { select: { id: true, name: true, captainId: true } },
      },
    });

    if (!match || !match.scorebook) return NextResponse.json({ error: 'Match or scorebook not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'Match is already locked as official result.' }, { status: 400 });

    if (!canVerifyMatchResult(auth, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: City or Super Admin authorization required to verify official result.' }, { status: 403 });
    }

    // Process Full Match Statistics, Recalculate Player & Team Stats, Leaderboards, Rankings & Lock Match
    const result = await processMatchFinalStatistics(match.id);

    await prisma.scorebook.update({
      where: { id: match.scorebook.id },
      data: {
        verifiedById: auth.userId,
        verifiedAt: new Date(),
      },
    });

    await prisma.match.update({
      where: { id: match.id },
      data: {
        lockedById: auth.userId,
      },
    });

    // Real-Time Events
    publishMatchEvent(match.id, 'MATCH_STATUS_UPDATE', { matchId: match.id, status: 'OFFICIAL', isLocked: true });
    publishCityEvent(match.cityId, 'RANKINGS_UPDATE', { cityId: match.cityId, sportId: match.sportId });
    publishGlobalEvent('RANKINGS_UPDATE', { cityId: match.cityId, sportId: match.sportId });

    // Send Real-Time Notifications to Captains
    if (match.homeTeam.captainId) {
      await sendNotification({
        userId: match.homeTeam.captainId,
        title: 'Match Result Verified & Official 🔒',
        message: `The official result for ${match.homeTeam.name} vs ${match.awayTeam.name} has been verified and locked. Standings updated!`,
        notificationType: 'MATCH_RESULT_VERIFIED',
        type: 'SUCCESS',
        linkUrl: `/matches/${match.id}`,
      });
    }

    if (match.awayTeam.captainId) {
      await sendNotification({
        userId: match.awayTeam.captainId,
        title: 'Match Result Verified & Official 🔒',
        message: `The official result for ${match.homeTeam.name} vs ${match.awayTeam.name} has been verified and locked. Standings updated!`,
        notificationType: 'MATCH_RESULT_VERIFIED',
        type: 'SUCCESS',
        linkUrl: `/matches/${match.id}`,
      });
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_OFFICIALLY_LOCKED',
      entityType: 'Match',
      entityId: match.id,
      changes: { mvpPlayerId: result.mvpPlayerId, scores: result.calculated },
    });

    return NextResponse.json({
      success: true,
      message: 'Match result officially verified and locked. Stats, ratings, and rankings updated!',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
