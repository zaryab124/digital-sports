import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/transfers/[id]/approve/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transfer = await prisma.playerTransfer.findUnique({
      where: { id: params.id },
      include: {
        oldTeam: true,
        newTeam: true,
        player: true,
      },
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer record not found' }, { status: 404 });

    const isAdmin = isSuperAdmin(auth) || isCityAdmin(auth, transfer.newTeam.cityId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: City or Super Admin approval required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body; // APPROVED, REJECTED

    if (action === 'REJECTED') {
      await prisma.playerTransfer.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          approvedById: auth.userId,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: 'Transfer rejected.' });
    }

    // Default or APPROVED: Execute Roster Mutation
    // 1. Mark former membership as FORMER
    await prisma.teamMember.updateMany({
      where: {
        teamId: transfer.oldTeamId,
        playerId: transfer.playerId,
        status: 'ACTIVE',
      },
      data: {
        status: 'FORMER',
        leftAt: new Date(),
      },
    });

    // 2. Create new ACTIVE membership in destination team
    await prisma.teamMember.create({
      data: {
        teamId: transfer.newTeamId,
        playerId: transfer.playerId,
        role: 'PLAYER',
        status: 'ACTIVE',
      },
    });

    // 3. Mark transfer COMPLETED
    await prisma.playerTransfer.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        approvedById: auth.userId,
        approvedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 4. Send in-app notification
    await prisma.notification.create({
      data: {
        userId: transfer.playerId,
        title: 'Transfer Approved & Completed',
        message: `Your transfer from ${transfer.oldTeam.name} to ${transfer.newTeam.name} has been completed!`,
        type: 'SUCCESS',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TRANSFER_APPROVED',
      entityType: 'PlayerTransfer',
      entityId: transfer.id,
      changes: { action: 'APPROVED', oldTeamId: transfer.oldTeamId, newTeamId: transfer.newTeamId },
    });

    return NextResponse.json({ success: true, message: 'Transfer approved and roster updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
