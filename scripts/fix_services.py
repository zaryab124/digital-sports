import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/services/payment-service.ts', """import { prisma } from '../lib/prisma';
import { createAuditLog } from './audit-service';

export async function getApplicableFee(feeType: string, sportId?: string, cityId?: string): Promise<number> {
  const config = await prisma.feeConfiguration.findFirst({
    where: {
      feeType,
      isActive: true,
      OR: [
        { sportId: sportId || undefined, cityId: cityId || undefined },
        { sportId: sportId || undefined, cityId: null },
        { sportId: null, cityId: null },
      ],
    },
    orderBy: [{ sportId: 'desc' }, { cityId: 'desc' }],
  });

  if (config) return config.amount;

  switch (feeType) {
    case 'TEAM_REGISTRATION':
      return 1000;
    case 'INDIVIDUAL_SPORT_REGISTRATION':
      return 500;
    case 'PLAYER_TRANSFER':
      return 100;
    default:
      return 0;
  }
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

  const updated = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: 'SUBMITTED',
      referenceNumber: params.transactionReference,
    },
  });

  // If associated with a team, update team status
  if (payment.teamId) {
    await prisma.team.update({
      where: { id: payment.teamId },
      data: { status: 'PAYMENT_SUBMITTED' },
    });
  }

  // If associated with a transfer, update transfer status
  const transfer = await prisma.playerTransfer.findFirst({
    where: { paymentId: payment.id },
  });
  if (transfer) {
    await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: { status: 'PAYMENT_SUBMITTED' },
    });
  }

  return updated;
}

export async function verifyPayment(params: {
  paymentId: string;
  verifiedById: string;
  action: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { team: true },
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
""")

write_file('src/services/audit-service.ts', """import { prisma } from '../lib/prisma';

export async function createAuditLog(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changesJson: JSON.stringify(params.changes || {}),
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
""")
