import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canManageCity } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const members = await prisma.teamMember.findMany({
      where: { teamId: params.id },
      include: {
        player: {
          select: {
            id: true,
            fullName: true,
            email: true,
            playerProfile: { include: { statistics: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id }, include: { sport: true } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCaptain = team.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || canManageCity(auth, team.cityId);
    if (!isCaptain && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { playerId, role, jerseyNumber } = body;

    if (!playerId) return NextResponse.json({ error: 'playerId is required' }, { status: 400 });

    const activeElsewhere = await prisma.teamMember.findFirst({
      where: {
        playerId,
        status: 'ACTIVE',
        team: {
          sportId: team.sportId,
          id: { not: team.id },
        },
      },
      include: { team: true },
    });

    if (activeElsewhere) {
      return NextResponse.json({
        error: `Player is already actively registered with ${activeElsewhere.team.name} in this sport. An official transfer must be completed first.`,
      }, { status: 400 });
    }

    const member = await prisma.teamMember.upsert({
      where: { teamId_playerId_status: { teamId: team.id, playerId, status: 'ACTIVE' } },
      update: { role: role || 'PLAYER', jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined },
      create: {
        teamId: team.id,
        playerId,
        role: role || 'PLAYER',
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
        status: 'ACTIVE',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_MEMBER_ADDED',
      entityType: 'TeamMember',
      entityId: member.id,
      changes: { teamId: team.id, playerId, role },
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
