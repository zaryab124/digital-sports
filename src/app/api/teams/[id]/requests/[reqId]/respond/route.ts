import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (team.captainId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden: Only captain can respond to squad requests' }, { status: 403 });
    }

    const request = await prisma.teamRequest.findUnique({
      where: { id: params.reqId },
      include: { player: true },
    });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    if (action === 'ACCEPT') {
      const existingMembership = await prisma.teamMember.findFirst({
        where: {
          playerId: request.playerId,
          status: 'ACTIVE',
          team: { sportId: team.sportId },
        },
      });

      if (existingMembership) {
        return NextResponse.json({
          error: 'Cannot accept player: Athlete is already active in another team for this sport.',
        }, { status: 400 });
      }

      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          playerId: request.playerId,
          role: 'PLAYER',
          status: 'ACTIVE',
        },
      });

      await prisma.teamRequest.update({
        where: { id: params.reqId },
        data: { status: 'APPROVED' },
      });

      await prisma.notification.create({
        data: {
          userId: request.playerId,
          title: 'Join Request Accepted!',
          message: `Your request to join ${team.name} was approved by Captain ${auth.fullName}.`,
          type: 'SUCCESS',
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'TEAM_REQUEST_APPROVED',
        entityType: 'TeamRequest',
        entityId: request.id,
      });

      return NextResponse.json({ success: true, message: 'Player added to active squad roster.' });
    } else {
      await prisma.teamRequest.update({
        where: { id: params.reqId },
        data: { status: 'REJECTED' },
      });

      return NextResponse.json({ success: true, message: 'Join request declined.' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
