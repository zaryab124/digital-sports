import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canScoreMatch } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: { officials: true, homeTeam: true, awayTeam: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'Match is official and locked from further changes.' }, { status: 400 });

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Assigned official or administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      teamsVerified,
      groundConfirmed,
      pitchCondition,
      tossWinnerTeamId,
      tossDecision,
      participants, // Array of { teamId, playerId, isStarting, jerseyNumber }
    } = body;

    // 1. Record / Update Player Participation
    if (Array.isArray(participants)) {
      for (const p of participants) {
        if (p.playerId && p.teamId) {
          await prisma.matchParticipant.upsert({
            where: { matchId_playerId: { matchId: match.id, playerId: p.playerId } },
            update: {
              isStarting: p.isStarting !== undefined ? p.isStarting : true,
            },
            create: {
              matchId: match.id,
              teamId: p.teamId,
              playerId: p.playerId,
              isStarting: p.isStarting !== undefined ? p.isStarting : true,
            },
          });
        }
      }
    }

    // 2. Update Scorebook Pre-match state
    const preMatchDetails = {
      teamsVerified: Boolean(teamsVerified),
      groundConfirmed: Boolean(groundConfirmed),
      pitchCondition: pitchCondition || 'Standard regulation pitch',
      tossWinnerTeamId: tossWinnerTeamId || null,
      tossDecision: tossDecision || null,
      preMatchVerifiedAt: new Date().toISOString(),
      verifiedByOfficialId: auth.userId,
    };

    const scorebook = await prisma.scorebook.upsert({
      where: { matchId: match.id },
      update: {
        currentStateJson: JSON.stringify({
          status: 'PRE_MATCH_CONFIRMED',
          preMatch: preMatchDetails,
        }),
      },
      create: {
        matchId: match.id,
        sportId: match.sportId,
        currentStateJson: JSON.stringify({
          status: 'PRE_MATCH_CONFIRMED',
          preMatch: preMatchDetails,
        }),
      },
    });

    // 3. Set match status to LIVE if both verified
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'LIVE',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'PREMATCH_VERIFIED',
      entityType: 'Match',
      entityId: match.id,
      changes: preMatchDetails,
    });

    return NextResponse.json({
      success: true,
      message: 'Pre-match verification completed. Match is now LIVE for scoring.',
      scorebook,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
