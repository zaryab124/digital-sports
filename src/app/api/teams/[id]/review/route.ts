import { NextRequest, NextResponse } from 'next/server';
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
      include: { city: true },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isAdmin = isSuperAdmin(auth) || isCityAdmin(auth, team.cityId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: City Admin or Super Admin review authority required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, reason } = body;

    if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be APPROVED or REJECTED.' }, { status: 400 });
    }

    const newStatus = action === 'APPROVED' ? 'ACTIVE' : 'REJECTED';

    const updatedTeam = await prisma.team.update({
      where: { id: params.id },
      data: { status: newStatus },
    });

    if (action === 'APPROVED') {
      const existingRanking = await prisma.teamRanking.findFirst({
        where: { teamId: team.id },
      });
      if (!existingRanking) {
        await prisma.teamRanking.create({
          data: {
            teamId: team.id,
            sportId: team.sportId,
            cityId: team.cityId,
            regionId: team.city.regionId,
            rankPosition: 99,
            points: 0,
            goalDiffOrNrr: 0,
          },
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: team.captainId,
        title: action === 'APPROVED' ? 'Squad Registration Approved!' : 'Squad Registration Rejected',
        message: action === 'APPROVED'
          ? `Congratulations! ${team.name} has been approved and is now ACTIVE on Sports Community.`
          : `Your squad registration for ${team.name} was rejected: ${reason || 'Incomplete verification'}.`,
        type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: `TEAM_${action}`,
      entityType: 'Team',
      entityId: team.id,
      changes: { action, newStatus, reason },
    });

    return NextResponse.json({ success: true, team: updatedTeam, message: `Team status updated to ${newStatus}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
