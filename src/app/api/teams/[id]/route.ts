import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { updateTeamSettingsSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        city: true,
        sport: true,
        captain: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            captainProfile: true,
          },
        },
        homeGround: true,
        members: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                playerProfile: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        invitations: {
          where: { status: 'PENDING' },
          include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        requests: {
          where: { status: 'PENDING' },
          include: { player: { select: { id: true, fullName: true, avatarUrl: true, playerProfile: true } } },
        },
        teamRankings: {
          orderBy: { points: 'desc' },
          take: 1,
        },
        teamStats: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        matchPhotos: {
          include: { uploader: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        payments: {
          include: { transactions: true, verifications: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        ground: true,
        scorebook: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 15,
    });

    const completedMatches = matches.filter((m) => m.status === 'OFFICIAL_VERIFIED' || m.isLocked);
    const wins = completedMatches.filter((m) => m.winnerTeamId === team.id).length;
    const losses = completedMatches.filter((m) => m.winnerTeamId && m.winnerTeamId !== team.id).length;
    const draws = completedMatches.filter((m) => !m.winnerTeamId && (m.isLocked || m.status === 'OFFICIAL_VERIFIED')).length;

    const activeMembers = team.members.filter((m) => m.status === 'ACTIVE');
    const formerMembers = team.members.filter((m) => m.status === 'FORMER');

    return NextResponse.json({
      team,
      metrics: {
        matchesPlayed: completedMatches.length,
        wins,
        losses,
        draws,
        points: team.teamRankings[0]?.points || wins * 3 + draws,
        rankingPosition: team.teamRankings[0]?.rankPosition || null,
      },
      activeMembers,
      formerMembers,
      matches,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCaptain = team.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || isCityAdmin(auth, team.cityId);
    if (!isCaptain && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Captain or Admin authority required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateTeamSettingsSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updated = await prisma.team.update({
      where: { id: params.id },
      data: validated.data,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_SETTINGS_UPDATED',
      entityType: 'Team',
      entityId: team.id,
      changes: validated.data,
    });

    return NextResponse.json({ team: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
