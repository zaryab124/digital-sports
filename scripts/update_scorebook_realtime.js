const fs = require('fs');

// 1. Update src/app/api/scorebook/[matchId]/events/route.ts
const eventsRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canScoreMatch } from '@/lib/rbac';
import { scoreEventSchema } from '@/lib/validations';
import { calculateScorebookState } from '@/services/scorebook-engine';
import { createAuditLog } from '@/services/audit-service';
import { publishMatchEvent } from '@/lib/realtime';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: { officials: true, sport: true, scorebook: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'This match is official and locked from further scoring edits.' }, { status: 400 });

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Assigned official or administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = scoreEventSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    // 1. Ensure Scorebook exists
    const scorebook = await prisma.scorebook.upsert({
      where: { matchId: match.id },
      update: {},
      create: {
        matchId: match.id,
        sportId: match.sportId,
      },
    });

    // 2. Create Score Event
    const event = await prisma.scoreEvent.create({
      data: {
        scorebookId: scorebook.id,
        matchId: match.id,
        eventType: validated.data.eventType,
        teamId: validated.data.teamId,
        playerId: validated.data.playerId || undefined,
        minuteOrBall: validated.data.minuteOrBall || undefined,
        setOrInnings: validated.data.setOrInnings || 1,
        detailsJson: validated.data.detailsJson,
      },
      include: {
        player: { select: { id: true, fullName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // 3. Ensure Match Participant is registered
    if (validated.data.playerId) {
      await prisma.matchParticipant.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId: validated.data.playerId } },
        update: {},
        create: {
          matchId: match.id,
          teamId: validated.data.teamId,
          playerId: validated.data.playerId,
        },
      });
    }

    // 4. Recalculate Live Scorebook State
    const allEvents = await prisma.scoreEvent.findMany({
      where: { scorebookId: scorebook.id },
      orderBy: { createdAt: 'asc' },
    });
    const state = calculateScorebookState(match.sport.code, match.homeTeamId, match.awayTeamId, allEvents);

    await prisma.scorebook.update({
      where: { id: scorebook.id },
      data: {
        currentStateJson: JSON.stringify(state),
      },
    });

    const updatedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'LIVE',
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        winnerTeamId: state.winnerTeamId || null,
      },
    });

    // 5. Publish Real-Time Match Score Event
    publishMatchEvent(match.id, 'MATCH_SCORE_UPDATE', {
      matchId: match.id,
      status: 'LIVE',
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      winnerTeamId: state.winnerTeamId,
      latestEvent: event,
      scoreState: state,
    });

    // 6. Complete Audit History for Every Score Change
    await createAuditLog({
      userId: auth.userId,
      action: 'SCORE_EVENT_RECORDED',
      entityType: 'ScoreEvent',
      entityId: event.id,
      changes: {
        matchId: match.id,
        eventType: event.eventType,
        teamId: event.teamId,
        playerId: event.playerId,
        newScores: { homeScore: state.homeScore, awayScore: state.awayScore },
      },
    });

    return NextResponse.json({
      success: true,
      event,
      scoreState: state,
      match: updatedMatch,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/scorebook/[matchId]/events/route.ts', eventsRoute.trim() + '\n', 'utf8');

// 2. Update src/app/api/scorebook/[matchId]/verify/route.ts
const verifyRoute = `import { NextRequest, NextResponse } from 'next/server';
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
        message: \`The official result for \${match.homeTeam.name} vs \${match.awayTeam.name} has been verified and locked. Standings updated!\`,
        notificationType: 'MATCH_RESULT_VERIFIED',
        type: 'SUCCESS',
        linkUrl: \`/matches/\${match.id}\`,
      });
    }

    if (match.awayTeam.captainId) {
      await sendNotification({
        userId: match.awayTeam.captainId,
        title: 'Match Result Verified & Official 🔒',
        message: \`The official result for \${match.homeTeam.name} vs \${match.awayTeam.name} has been verified and locked. Standings updated!\`,
        notificationType: 'MATCH_RESULT_VERIFIED',
        type: 'SUCCESS',
        linkUrl: \`/matches/\${match.id}\`,
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
`;
fs.writeFileSync('src/app/api/scorebook/[matchId]/verify/route.ts', verifyRoute.trim() + '\n', 'utf8');

console.log('[OK] Updated scorebook events and verification with realtime & notifications');
