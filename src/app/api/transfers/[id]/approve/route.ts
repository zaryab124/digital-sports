import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { transferActionSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';
import { sendNotification } from '@/services/notification-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transfer = await prisma.playerTransfer.findUnique({
      where: { id: params.id },
      include: {
        oldTeam: { include: { captain: true } },
        newTeam: { include: { captain: true } },
        player: true,
        payment: true,
      },
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer record not found' }, { status: 404 });

    const body = await req.json();
    const validated = transferActionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { action, rejectionReason, notes } = validated.data;
    const isOldCaptain = transfer.oldTeam.captainId === auth.userId;
    const isNewCaptain = transfer.newTeam.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || isCityAdmin(auth, transfer.cityId);
    const isPlayer = transfer.playerId === auth.userId;

    // --- ACTION 1: REJECT ---
    if (action === 'REJECT') {
      if (!isOldCaptain && !isNewCaptain && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only team captains or administrators can reject a transfer' }, { status: 403 });
      }

      const updated = await prisma.playerTransfer.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Transfer request declined by club authority.',
          approvedById: auth.userId,
          approvedAt: new Date(),
        },
      });

      await sendNotification({
        userId: transfer.playerId,
        title: 'Transfer Request Rejected',
        message: `Your transfer from ${transfer.oldTeam.name} to ${transfer.newTeam.name} was rejected: ${rejectionReason || 'Declined'}.`,
        notificationType: 'TRANSFER_REJECTED',
        type: 'WARNING',
        linkUrl: `/transfers`,
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'TRANSFER_REJECTED',
        entityType: 'PlayerTransfer',
        entityId: transfer.id,
        changes: { rejectionReason },
      });

      return NextResponse.json({ success: true, message: 'Transfer request rejected.', transfer: updated });
    }

    // --- ACTION 2: CANCEL ---
    if (action === 'CANCEL') {
      if (!isPlayer && transfer.requesterId !== auth.userId && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only the transferring player or requester can cancel this request' }, { status: 403 });
      }

      const updated = await prisma.playerTransfer.update({
        where: { id: params.id },
        data: {
          status: 'CANCELLED',
          rejectionReason: 'Cancelled by player/requester.',
        },
      });

      return NextResponse.json({ success: true, message: 'Transfer request cancelled.', transfer: updated });
    }

    // --- ACTION 3: RELEASE APPROVAL (NOC) ---
    if (action === 'RELEASE_APPROVE') {
      if (!isOldCaptain && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only the releasing team captain or administrator can grant NOC approval' }, { status: 403 });
      }

      const nextStatus = (transfer.receivingApproved || isNewCaptain) ? 'PENDING_APPROVAL' : 'REQUESTED';

      const updated = await prisma.playerTransfer.update({
        where: { id: params.id },
        data: {
          releasingApproved: true,
          releasingApprovedAt: new Date(),
          status: nextStatus,
        },
      });

      if (transfer.newTeam.captainId) {
        await sendNotification({
          userId: transfer.newTeam.captainId,
          title: 'NOC Granted for Player Transfer',
          message: `Captain ${auth.fullName} (${transfer.oldTeam.name}) has granted NOC release for ${transfer.player.fullName}.`,
          notificationType: 'TRANSFER_REQUEST',
          type: 'INFO',
          linkUrl: `/transfers`,
        });
      }

      await sendNotification({
        userId: transfer.playerId,
        title: 'NOC Release Approved',
        message: `Captain ${transfer.oldTeam.name} has approved your release NOC.`,
        notificationType: 'TRANSFER_APPROVED',
        type: 'SUCCESS',
        linkUrl: `/transfers`,
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'TRANSFER_NOC_RELEASED',
        entityType: 'PlayerTransfer',
        entityId: transfer.id,
      });

      return NextResponse.json({ success: true, message: 'Releasing NOC approved successfully.', transfer: updated });
    }

    // --- ACTION 4: RECEIVING TEAM APPROVAL ---
    if (action === 'RECEIVING_APPROVE') {
      if (!isNewCaptain && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only the receiving team captain or administrator can accept this player' }, { status: 403 });
      }

      const nextStatus = (transfer.releasingApproved || isOldCaptain) ? 'PENDING_APPROVAL' : 'REQUESTED';

      const updated = await prisma.playerTransfer.update({
        where: { id: params.id },
        data: {
          receivingApproved: true,
          receivingApprovedAt: new Date(),
          status: nextStatus,
        },
      });

      await sendNotification({
        userId: transfer.playerId,
        title: 'Target Squad Acceptance Approved',
        message: `Captain ${transfer.newTeam.name} has approved your squad induction request.`,
        notificationType: 'TRANSFER_APPROVED',
        type: 'SUCCESS',
        linkUrl: `/transfers`,
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'TRANSFER_RECEIVING_APPROVED',
        entityType: 'PlayerTransfer',
        entityId: transfer.id,
      });

      return NextResponse.json({ success: true, message: 'Receiving squad acceptance approved.', transfer: updated });
    }

    // --- ACTION 5: ADMIN VERIFICATION & FINAL ROSTER MIGRATION ---
    if (action === 'ADMIN_VERIFY') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: City or Super Admin authority required for final verification and roster execution.' }, { status: 403 });
      }

      // Check payment status
      if (transfer.payment && transfer.payment.status === 'PENDING') {
        // Auto-verify payment order if admin verified
        await prisma.payment.update({
          where: { id: transfer.payment.id },
          data: {
            status: 'VERIFIED',
            verifiedById: auth.userId,
            verifiedAt: new Date(),
          },
        });
      }

      // 1. Soft-update old membership to FORMER with leftAt (NEVER HARD DELETE)
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
          joinedAt: new Date(),
        },
      });

      // 3. Mark transfer COMPLETED
      const completedTransfer = await prisma.playerTransfer.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          releasingApproved: true,
          receivingApproved: true,
          approvedById: auth.userId,
          approvedAt: new Date(),
          completedAt: new Date(),
          notes: notes || undefined,
        },
      });

      // 4. Notifications
      await sendNotification({
        userId: transfer.playerId,
        title: 'Player Transfer Completed! 🎉',
        message: `Congratulations! Your transfer from ${transfer.oldTeam.name} to ${transfer.newTeam.name} has been officially completed.`,
        notificationType: 'TRANSFER_APPROVED',
        type: 'SUCCESS',
        linkUrl: `/transfers`,
      });

      if (transfer.oldTeam.captainId) {
        await sendNotification({
          userId: transfer.oldTeam.captainId,
          title: 'Roster Transfer Executed',
          message: `${transfer.player.fullName} has been officially transferred from ${transfer.oldTeam.name} to ${transfer.newTeam.name}.`,
          notificationType: 'TRANSFER_APPROVED',
          type: 'INFO',
          linkUrl: `/transfers`,
        });
      }

      if (transfer.newTeam.captainId) {
        await sendNotification({
          userId: transfer.newTeam.captainId,
          title: 'New Athlete Added to Roster',
          message: `${transfer.player.fullName} is now an active member of ${transfer.newTeam.name}.`,
          notificationType: 'TRANSFER_APPROVED',
          type: 'SUCCESS',
          linkUrl: `/transfers`,
        });
      }

      await createAuditLog({
        userId: auth.userId,
        action: 'PLAYER_TRANSFER_COMPLETED',
        entityType: 'PlayerTransfer',
        entityId: transfer.id,
        changes: {
          playerId: transfer.playerId,
          oldTeamId: transfer.oldTeamId,
          newTeamId: transfer.newTeamId,
          fee: transfer.fee,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Player transfer officially verified and executed. Squad rosters updated.',
        transfer: completedTransfer,
      });
    }

    return NextResponse.json({ error: 'Invalid transfer action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
