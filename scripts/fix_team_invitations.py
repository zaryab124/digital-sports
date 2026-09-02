import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/teams/[id]/invitations/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: true },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCaptain = team.captainId === auth.userId;
    const isAuthorized = isCaptain || isSuperAdmin(auth) || isCityAdmin(auth, team.cityId);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Team captain privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { playerId } = body;

    if (!playerId) return NextResponse.json({ error: 'Player ID required' }, { status: 400 });

    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: { teamId: params.id, playerId, status: 'PENDING' },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'An active invitation is already pending for this player' }, { status: 400 });
    }

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: params.id,
        playerId,
        invitedById: auth.userId,
        status: 'PENDING',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_INVITATION_SENT',
      entityType: 'TeamInvitation',
      entityId: invitation.id,
      changes: { teamId: params.id, playerId },
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
