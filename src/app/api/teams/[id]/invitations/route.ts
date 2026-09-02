import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { invitePlayerSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId: params.id },
      include: {
        player: { select: { id: true, fullName: true, email: true, avatarUrl: true, playerProfile: true } },
        invitedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ invitations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: true },
    });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (team.captainId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden: Only squad captain can invite players' }, { status: 403 });
    }

    const body = await req.json();
    const validated = invitePlayerSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    let targetUserId = validated.data.playerId;
    if (!targetUserId && validated.data.playerEmail) {
      const userByEmail = await prisma.user.findUnique({ where: { email: validated.data.playerEmail } });
      if (!userByEmail) return NextResponse.json({ error: 'Player with this email address was not found' }, { status: 404 });
      targetUserId = userByEmail.id;
    }

    if (!targetUserId) return NextResponse.json({ error: 'Player ID or Email is required' }, { status: 400 });

    const alreadyMember = team.members.some((m) => m.playerId === targetUserId && m.status === 'ACTIVE');
    if (alreadyMember) return NextResponse.json({ error: 'Athlete is already an active member of this squad' }, { status: 400 });

    const existing = await prisma.teamInvitation.findFirst({
      where: { teamId: params.id, playerId: targetUserId, status: 'PENDING' },
    });
    if (existing) return NextResponse.json({ error: 'An invitation is already pending for this athlete' }, { status: 400 });

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: params.id,
        playerId: targetUserId,
        invitedById: auth.userId,
        role: validated.data.role || 'PLAYER',
        message: validated.data.message || undefined,
        status: 'PENDING',
      },
      include: { player: { select: { id: true, fullName: true, email: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'Team Invitation Received',
        message: `Captain ${auth.fullName} has invited you to join ${team.name}.`,
        type: 'INFO',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_INVITATION_SENT',
      entityType: 'TeamInvitation',
      entityId: invitation.id,
      changes: { teamId: params.id, targetUserId },
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
