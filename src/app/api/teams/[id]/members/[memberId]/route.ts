import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCaptain = team.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || isCityAdmin(auth, team.cityId);
    if (!isCaptain && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Captain or Admin authority required' }, { status: 403 });
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: params.memberId },
      include: { player: true },
    });

    if (!member || member.teamId !== params.id) {
      return NextResponse.json({ error: 'Roster member not found in this squad' }, { status: 404 });
    }

    if (member.role === 'CAPTAIN') {
      return NextResponse.json({ error: 'Captain cannot be removed from roster. Transfer captaincy first.' }, { status: 400 });
    }

    // Historical Preservation: NEVER delete rows, soft-update to FORMER with leftAt timestamp!
    const updatedMember = await prisma.teamMember.update({
      where: { id: params.memberId },
      data: {
        status: 'FORMER',
        leftAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: member.playerId,
        title: 'Squad Roster Update',
        message: `You have been removed from the active roster of ${team.name}. Your club history has been preserved in alumni archives.`,
        type: 'INFO',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_MEMBER_REMOVED_TO_FORMER',
      entityType: 'TeamMember',
      entityId: member.id,
      changes: { previousStatus: 'ACTIVE', newStatus: 'FORMER', leftAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Player transitioned to historical alumni roster (record preserved).',
      member: updatedMember,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
