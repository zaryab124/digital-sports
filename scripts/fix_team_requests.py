import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/teams/[id]/requests/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
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

    const isMember = team.members.some((m) => m.playerId === auth.userId && m.status === 'ACTIVE');
    if (isMember) {
      return NextResponse.json({ error: 'You are already an active roster member of this team' }, { status: 400 });
    }

    const existing = await prisma.teamRequest.findFirst({
      where: { teamId: params.id, playerId: auth.userId, status: 'PENDING' },
    });

    if (existing) {
      return NextResponse.json({ error: 'A join request is already pending for this squad' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const message = body.message;

    const request = await prisma.teamRequest.create({
      data: {
        teamId: params.id,
        playerId: auth.userId,
        message: message || undefined,
        status: 'PENDING',
      },
    });

    if (team.captainId) {
      await prisma.notification.create({
        data: {
          userId: team.captainId,
          title: 'Team Join Request',
          message: `${auth.fullName} has requested to join ${team.name}.`,
          type: 'INFO',
        },
      });
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_JOIN_REQUESTED',
      entityType: 'TeamRequest',
      entityId: request.id,
      changes: { teamId: params.id },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
