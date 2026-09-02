import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canScoreMatch } from '@/lib/rbac';
import { calculateScorebookState } from '@/services/scorebook-engine';
import { createAuditLog } from '@/services/audit-service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { matchId: string; eventId: string } }
) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: { officials: true, sport: true, scorebook: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'This match is locked and official.' }, { status: 400 });

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const event = await prisma.scoreEvent.findUnique({
      where: { id: params.eventId },
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Delete Event
    await prisma.scoreEvent.delete({ where: { id: params.eventId } });

    // Recalculate State
    if (match.scorebook) {
      const allEvents = await prisma.scoreEvent.findMany({
        where: { scorebookId: match.scorebook.id },
      });
      const state = calculateScorebookState(match.sport.code, match.homeTeamId, match.awayTeamId, allEvents);

      await prisma.scorebook.update({
        where: { id: match.scorebook.id },
        data: { currentStateJson: JSON.stringify(state) },
      });

      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          winnerTeamId: state.winnerTeamId || null,
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'SCORE_EVENT_REVERTED',
        entityType: 'ScoreEvent',
        entityId: params.eventId,
        changes: { revertedEventType: event.eventType, newHomeScore: state.homeScore, newAwayScore: state.awayScore },
      });

      return NextResponse.json({ success: true, message: 'Score event reverted successfully', state });
    }

    return NextResponse.json({ success: true, message: 'Event removed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
