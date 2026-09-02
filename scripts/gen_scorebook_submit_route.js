const fs = require('fs');

const submitRoute = `import { NextRequest, NextResponse } from 'next/server';
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
      include: { officials: true, scorebook: true, homeTeam: true, awayTeam: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'Match is already locked as official result.' }, { status: 400 });

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Assigned official or administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { summaryNotes, evidencePhotoUrl, mvpPlayerId } = body;

    // 1. If photo evidence attached, record MatchPhoto
    if (evidencePhotoUrl) {
      await prisma.matchPhoto.create({
        data: {
          matchId: match.id,
          teamId: match.homeTeamId,
          sportId: match.sportId,
          photoUrl: evidencePhotoUrl,
          caption: 'Official Match Result Scoresheet & Verification Evidence',
          uploadedById: auth.userId,
          status: 'APPROVED',
        },
      });
    }

    // 2. Update Scorebook Record
    const scorebook = await prisma.scorebook.upsert({
      where: { matchId: match.id },
      update: {
        submittedById: auth.userId,
        submittedAt: new Date(),
        mvpPlayerId: mvpPlayerId || undefined,
      },
      create: {
        matchId: match.id,
        sportId: match.sportId,
        submittedById: auth.userId,
        submittedAt: new Date(),
        mvpPlayerId: mvpPlayerId || undefined,
      },
    });

    // 3. Advance Match Status to RESULT_PENDING_VERIFICATION
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'RESULT_PENDING_VERIFICATION',
        notes: summaryNotes || match.notes || undefined,
      },
    });

    // 4. Audit Log
    await createAuditLog({
      userId: auth.userId,
      action: 'SCOREBOOK_SUBMITTED',
      entityType: 'Scorebook',
      entityId: scorebook.id,
      changes: {
        matchId: match.id,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        hasEvidencePhoto: Boolean(evidencePhotoUrl),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Scorebook finalized and submitted for administrative verification.',
      match: updated,
      scorebook,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/scorebook/[matchId]/submit/route.ts', submitRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/scorebook/[matchId]/submit/route.ts');
