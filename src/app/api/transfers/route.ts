import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { transferRequestSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const cityId = searchParams.get('cityId');
    const sportId = searchParams.get('sportId');
    const playerId = searchParams.get('playerId');
    const teamId = searchParams.get('teamId');

    const isAdmin = isSuperAdmin(auth) || (cityId && isCityAdmin(auth, cityId));

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (cityId && cityId !== 'ALL') where.cityId = cityId;
    if (sportId && sportId !== 'ALL') where.sportId = sportId;
    if (playerId) where.playerId = playerId;
    if (teamId) {
      where.OR = [{ oldTeamId: teamId }, { newTeamId: teamId }];
    }

    // If regular user (non-admin), restrict to their own transfers, or transfers involving teams they captain
    if (!isAdmin && !playerId && !teamId) {
      const captainedTeams = await prisma.team.findMany({
        where: { captainId: auth.userId },
        select: { id: true },
      });
      const captainTeamIds = captainedTeams.map((t) => t.id);

      where.OR = [
        { playerId: auth.userId },
        { oldTeamId: { in: captainTeamIds } },
        { newTeamId: { in: captainTeamIds } },
      ];
    }

    const transfers = await prisma.playerTransfer.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            playerProfile: true,
          },
        },
        oldTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true } },
            city: true,
          },
        },
        newTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true } },
            city: true,
          },
        },
        sport: true,
        city: true,
        payment: {
          include: {
            transactions: { orderBy: { createdAt: 'desc' } },
            verifications: true,
          },
        },
        requester: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = transferRequestSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const targetPlayerId = validated.data.playerId || auth.userId;
    const { sportId, newTeamId, reason, notes } = validated.data;

    // 1. Eligibility & Active Membership in Source Squad Check
    const player = await prisma.user.findUnique({
      where: { id: targetPlayerId },
      include: { playerProfile: true },
    });
    if (!player) {
      return NextResponse.json({ error: 'Player account not found or ineligible' }, { status: 404 });
    }

    const currentMembership = await prisma.teamMember.findFirst({
      where: {
        playerId: targetPlayerId,
        status: 'ACTIVE',
        team: { sportId },
      },
      include: { team: { include: { captain: true } } },
    });

    if (!currentMembership) {
      return NextResponse.json(
        { error: 'Player is not actively rostered in any squad for this sport.' },
        { status: 400 }
      );
    }

    const oldTeam = currentMembership.team;
    if (oldTeam.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Current squad is inactive. Transfer cannot be processed.' },
        { status: 400 }
      );
    }

    // 2. Destination Squad Validations
    const destinationTeam = await prisma.team.findUnique({
      where: { id: newTeamId },
      include: { captain: true },
    });

    if (!destinationTeam) {
      return NextResponse.json({ error: 'Target destination squad does not exist.' }, { status: 404 });
    }

    if (destinationTeam.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Target squad is not active and cannot receive player transfers.' },
        { status: 400 }
      );
    }

    if (destinationTeam.sportId !== sportId) {
      return NextResponse.json(
        { error: 'Sport mismatch: Destination squad does not participate in the selected sport.' },
        { status: 400 }
      );
    }

    if (oldTeam.id === destinationTeam.id) {
      return NextResponse.json(
        { error: 'Duplicate Membership: Athlete is already an active member of this squad.' },
        { status: 400 }
      );
    }

    // 3. Duplicate Pending Transfer Check
    const pendingTransfer = await prisma.playerTransfer.findFirst({
      where: {
        playerId: targetPlayerId,
        sportId,
        status: { in: ['REQUESTED', 'PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'] },
      },
    });

    if (pendingTransfer) {
      return NextResponse.json(
        { error: 'A transfer request is already actively in progress for this player in this sport.' },
        { status: 400 }
      );
    }

    // 4. Create Rs. 100 Transfer Fee Payment Order
    const transferFee = 100.0;
    const payment = await prisma.payment.create({
      data: {
        userId: targetPlayerId,
        sportId,
        cityId: destinationTeam.cityId,
        paymentType: 'PLAYER_TRANSFER',
        amount: transferFee,
        currency: 'PKR',
        status: 'PENDING',
        referenceNumber: `TRF-${Date.now()}`,
      },
    });

    // 5. Create Transfer Record in REQUESTED status
    const transfer = await prisma.playerTransfer.create({
      data: {
        playerId: targetPlayerId,
        sportId,
        cityId: destinationTeam.cityId,
        oldTeamId: oldTeam.id,
        newTeamId: destinationTeam.id,
        requesterId: auth.userId,
        paymentId: payment.id,
        fee: transferFee,
        reason: reason || notes || 'Official club player transfer request',
        notes: notes || undefined,
        status: 'REQUESTED',
      },
      include: {
        oldTeam: true,
        newTeam: true,
        sport: true,
        city: true,
        payment: true,
      },
    });

    // 6. Dispatch Notifications to Releasing Captain, Receiving Captain, and Player
    if (oldTeam.captainId) {
      await prisma.notification.create({
        data: {
          userId: oldTeam.captainId,
          title: 'Transfer NOC Release Requested',
          message: `${player.fullName} has requested a transfer from ${oldTeam.name} to ${destinationTeam.name}. Your NOC approval is required.`,
          type: 'ACTION_REQUIRED',
        },
      });
    }

    if (destinationTeam.captainId) {
      await prisma.notification.create({
        data: {
          userId: destinationTeam.captainId,
          title: 'Inbound Player Transfer Request',
          message: `${player.fullName} (${oldTeam.name}) has applied to join ${destinationTeam.name}.`,
          type: 'INFO',
        },
      });
    }

    if (player.id !== auth.userId) {
      await prisma.notification.create({
        data: {
          userId: player.id,
          title: 'Transfer Request Initiated',
          message: `A transfer request from ${oldTeam.name} to ${destinationTeam.name} has been initiated for you.`,
          type: 'INFO',
        },
      });
    }

    // 7. Audit Trail
    await createAuditLog({
      userId: auth.userId,
      action: 'PLAYER_TRANSFER_REQUESTED',
      entityType: 'PlayerTransfer',
      entityId: transfer.id,
      changes: {
        playerId: targetPlayerId,
        oldTeamId: oldTeam.id,
        newTeamId: destinationTeam.id,
        fee: transferFee,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Player transfer request submitted successfully. Rs. 100 transfer fee payment order created.',
        transfer,
        payment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
