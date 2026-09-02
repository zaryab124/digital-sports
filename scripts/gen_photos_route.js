const fs = require('fs');

const photosRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const auth = getAuthUser(req);
    const isAdmin = auth && (isSuperAdmin(auth) || auth.roles.some((r: any) => r.roleCode === 'CITY_ADMIN'));

    const where: any = { cityId: params.cityId };
    if (!isAdmin) {
      if (auth) {
        where.OR = [
          { status: 'APPROVED' },
          { uploaderId: auth.userId },
        ];
      } else {
        where.status = 'APPROVED';
      }
    }

    const photos = await prisma.matchPhoto.findMany({
      where,
      include: {
        uploader: { select: { id: true, fullName: true, avatarUrl: true } },
        match: {
          select: {
            id: true,
            status: true,
            homeScore: true,
            awayScore: true,
            scheduledAt: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        },
        team: { select: { id: true, name: true, code: true, logoUrl: true } },
        sport: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { matchId, photoUrl, caption } = body;

    if (!matchId || !photoUrl) {
      return NextResponse.json({ error: 'matchId and photoUrl are required' }, { status: 400 });
    }

    // 1. Fetch Match Details
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sport: true,
        homeTeam: { include: { members: true } },
        awayTeam: { include: { members: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 2. Rule: Match must be officially locked with a verified result
    if (!match.isLocked || (match.status !== 'OFFICIAL' && match.status !== 'OFFICIAL_VERIFIED')) {
      return NextResponse.json({
        error: 'Winning photos can only be uploaded for matches with an OFFICIAL verified result.',
      }, { status: 400 });
    }

    // 3. Rule: Match must have a winner (not a draw/no-result)
    if (!match.winnerTeamId) {
      return NextResponse.json({
        error: 'Cannot upload winning photo for a drawn match or match without a winner.',
      }, { status: 400 });
    }

    // 4. Rule: User must be a member of the winning team (or an admin)
    const isAdmin = isSuperAdmin(auth) || auth.roles.some((r: any) => r.roleCode === 'CITY_ADMIN');
    const winningTeam = match.winnerTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam;
    const isWinnerMember = winningTeam.members.some((m) => m.playerId === auth.userId && m.status === 'ACTIVE');

    if (!isAdmin && !isWinnerMember) {
      return NextResponse.json({
        error: 'Forbidden: Only active members of the winning team can upload the official winning photo.',
      }, { status: 403 });
    }

    // 5. Create MatchPhoto linked to match, team, city, and sport
    const photo = await prisma.matchPhoto.create({
      data: {
        matchId: match.id,
        teamId: match.winnerTeamId,
        cityId: params.cityId || match.cityId,
        sportId: match.sportId,
        uploaderId: auth.userId,
        photoUrl,
        caption: caption || 'Official Match Victory Celebration',
        status: isAdmin ? 'APPROVED' : 'PENDING_MODERATION',
        moderatedById: isAdmin ? auth.userId : undefined,
        moderatedAt: isAdmin ? new Date() : undefined,
      },
      include: {
        uploader: { select: { id: true, fullName: true, avatarUrl: true } },
        team: { select: { id: true, name: true, code: true } },
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'WINNING_PHOTO_UPLOADED',
      entityType: 'MatchPhoto',
      entityId: photo.id,
      changes: { matchId: match.id, teamId: match.winnerTeamId, photoUrl, status: photo.status },
    });

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? 'Winning photo published successfully.'
        : 'Winning photo submitted for community administrator review.',
      photo,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/community/[cityId]/photos/route.ts', photosRoute.trim() + '\n', 'utf8');
console.log('[OK] Updated src/app/api/community/[cityId]/photos/route.ts');
