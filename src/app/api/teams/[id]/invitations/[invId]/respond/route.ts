import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; invId: string } }
) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: params.invId },
      include: { team: true },
    });

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (invitation.playerId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden: You can only respond to your own invitations' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'ACCEPT') {
      const existingMembership = await prisma.teamMember.findFirst({
        where: {
          playerId: auth.userId,
          status: 'ACTIVE',
          team: { sportId: invitation.team.sportId },
        },
      });

      if (existingMembership) {
        return NextResponse.json({
          error: 'Dual-Team Restriction: You are already actively rostered in another club for this sport. You must request a transfer first.',
        }, { status: 400 });
      }

      await prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          playerId: auth.userId,
          role: invitation.role || 'PLAYER',
          status: 'ACTIVE',
        },
      });

      await prisma.teamInvitation.update({
        where: { id: params.invId },
        data: { status: 'ACCEPTED' },
      });

      await prisma.notification.create({
        data: {
          userId: invitation.team.captainId,
          title: 'Invitation Accepted!',
          message: `${auth.fullName} has accepted your invitation and joined ${invitation.team.name}.`,
          type: 'SUCCESS',
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'TEAM_INVITATION_ACCEPTED',
        entityType: 'TeamInvitation',
        entityId: invitation.id,
      });

      return NextResponse.json({ success: true, message: 'You have joined the squad!' });
    } else {
      await prisma.teamInvitation.update({
        where: { id: params.invId },
        data: { status: 'DECLINED' },
      });

      return NextResponse.json({ success: true, message: 'Invitation declined.' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
