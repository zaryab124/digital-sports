import { sendNotification } from './notification-service';
import { publishEvent, publishUserEvent } from '@/lib/realtime';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from './audit-service';

export async function getApplicableFee(feeType: string, sportId?: string, cityId?: string): Promise<number> {
  // 1. City + Sport specific fee override
  if (cityId && sportId) {
    const override = await prisma.feeConfiguration.findFirst({
      where: { feeType, cityId, sportId, isActive: true },
    });
    if (override) return override.amount;
  }

  // 2. City specific fee override
  if (cityId) {
    const cityOverride = await prisma.feeConfiguration.findFirst({
      where: { feeType, cityId, sportId: null, isActive: true },
    });
    if (cityOverride) return cityOverride.amount;
  }

  // 3. Sport specific fee override
  if (sportId) {
    const sportOverride = await prisma.feeConfiguration.findFirst({
      where: { feeType, cityId: null, sportId, isActive: true },
    });
    if (sportOverride) return sportOverride.amount;
  }

  // 4. Default global fee configuration
  const defaultFee = await prisma.feeConfiguration.findFirst({
    where: { feeType, cityId: null, sportId: null, isActive: true },
  });

  return defaultFee ? defaultFee.amount : 500.0;
}

export async function createPaymentOrder(params: {
  userId: string;
  paymentType: string;
  amount?: number;
  teamId?: string;
  sportId?: string;
  cityId?: string;
}) {
  const amount = params.amount ?? (await getApplicableFee(params.paymentType, params.sportId, params.cityId));

  const payment = await prisma.payment.create({
    data: {
      userId: params.userId,
      teamId: params.teamId,
      sportId: params.sportId,
      cityId: params.cityId,
      paymentType: params.paymentType,
      amount,
      currency: 'PKR',
      status: 'PENDING',
    },
  });

  return payment;
}

export async function submitPaymentProof(params: {
  paymentId: string;
  paymentMethod: string;
  transactionReference: string;
  proofImageUrl?: string;
  remarks?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });

  if (!payment) throw new Error('Payment not found');

  await prisma.paymentTransaction.create({
    data: {
      paymentId: params.paymentId,
      paymentMethod: params.paymentMethod,
      transactionReference: params.transactionReference,
      proofImageUrl: params.proofImageUrl,
      remarks: params.remarks,
    },
  });

  const updatedPayment = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: 'SUBMITTED',
      referenceNumber: params.transactionReference,
    },
  });

  // Advance parent entity status to PAYMENT_SUBMITTED
  if (payment.teamId) {
    await prisma.team.update({
      where: { id: payment.teamId },
      data: { status: 'PAYMENT_SUBMITTED' },
    });
  }

  const transfer = await prisma.playerTransfer.findFirst({
    where: { paymentId: payment.id },
  });
  if (transfer) {
    await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: { status: 'PAYMENT_SUBMITTED' },
    });
  }

  await createAuditLog({
    userId: payment.userId,
    action: 'PAYMENT_PROOF_SUBMITTED',
    entityType: 'Payment',
    entityId: payment.id,
    changes: {
      method: params.paymentMethod,
      ref: params.transactionReference,
    },
  });

  return updatedPayment;
}

export async function verifyPayment(params: {
  paymentId: string;
  verifiedById: string;
  action: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });

  if (!payment) throw new Error('Payment not found');

  await prisma.paymentVerification.create({
    data: {
      paymentId: params.paymentId,
      verifiedById: params.verifiedById,
      action: params.action,
      rejectionReason: params.rejectionReason,
    },
  });

  const isApproved = params.action === 'APPROVED';
  const updatedPayment = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: isApproved ? 'VERIFIED' : 'REJECTED',
      verifiedById: params.verifiedById,
      verifiedAt: new Date(),
    },
  });

  // Handle Team Payment Approval
  if (payment.teamId) {
    await prisma.team.update({
      where: { id: payment.teamId },
      data: {
        status: isApproved ? 'PENDING_APPROVAL' : 'PENDING_PAYMENT',
      },
    });
  }

  // Handle Transfer Payment Approval
  const transfer = await prisma.playerTransfer.findFirst({
    where: { paymentId: payment.id },
  });
  if (transfer) {
    await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: {
        status: isApproved ? 'PENDING_APPROVAL' : 'PENDING_PAYMENT',
      },
    });
  }

  // Notify user
  await prisma.notification.create({
    data: {
      userId: payment.userId,
      title: isApproved ? 'Payment Verified' : 'Payment Rejected',
      message: isApproved
        ? `Your payment of PKR ${payment.amount} for ${payment.paymentType} has been verified.`
        : `Your payment was rejected: ${params.rejectionReason || 'Invalid proof'}.`,
      type: isApproved ? 'SUCCESS' : 'WARNING',
    },
  });

  await createAuditLog({
    userId: params.verifiedById,
    action: isApproved ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
    entityType: 'Payment',
    entityId: payment.id,
    changes: { action: params.action, rejectionReason: params.rejectionReason },
  });

  return updatedPayment;
}

export async function createTransferRequest(params: {
  playerId: string;
  sportId: string;
  newTeamId: string;
  notes?: string;
}) {
  const currentMembership = await prisma.teamMember.findFirst({
    where: { playerId: params.playerId, status: 'ACTIVE', team: { sportId: params.sportId } },
    include: { team: true },
  });

  if (!currentMembership) {
    throw new Error('Player is not actively rostered in any squad for this sport.');
  }

  const destinationTeam = await prisma.team.findUnique({
    where: { id: params.newTeamId },
  });

  if (!destinationTeam) {
    throw new Error('Destination team does not exist.');
  }

  if (currentMembership.teamId === destinationTeam.id) {
    throw new Error('Player is already a member of this team.');
  }

  const transferFee = await getApplicableFee('PLAYER_TRANSFER', params.sportId, destinationTeam.cityId);

  const payment = await createPaymentOrder({
    userId: params.playerId,
    sportId: params.sportId,
    cityId: destinationTeam.cityId,
    paymentType: 'PLAYER_TRANSFER',
    amount: transferFee,
  });

  const transfer = await prisma.playerTransfer.create({
    data: {
      playerId: params.playerId,
      sportId: params.sportId,
      cityId: destinationTeam.cityId,
      oldTeamId: currentMembership.teamId,
      newTeamId: destinationTeam.id,
      paymentId: payment.id,
      fee: transferFee,
      notes: params.notes,
      status: 'PENDING_PAYMENT',
    },
    include: {
      oldTeam: true,
      newTeam: true,
      payment: true,
    },
  });

  // Notify destination captain
  const destTeamWithCap = await prisma.team.findUnique({ where: { id: params.newTeamId }, select: { captainId: true, name: true } });
  if (destTeamWithCap?.captainId) {
    await sendNotification({
      userId: destTeamWithCap.captainId,
      title: 'New Player Transfer Request 📋',
      message: `A player has initiated a transfer request to join ${destTeamWithCap.name}.`,
      notificationType: 'TRANSFER_REQUEST',
      type: 'INFO',
      linkUrl: '/captain',
    });
  }

  return { transfer, payment };
}
