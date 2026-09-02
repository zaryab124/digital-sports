import { NextRequest, NextResponse } from 'next/server';
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
