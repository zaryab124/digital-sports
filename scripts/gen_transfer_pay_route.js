const fs = require('fs');
const path = require('path');

fs.mkdirSync('src/app/api/transfers/[id]/pay', { recursive: true });
fs.mkdirSync('src/app/api/transfers/[id]/approve', { recursive: true });

const payRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { transferPaymentSchema } from '@/lib/validations';
import { submitPaymentProof } from '@/services/payment-service';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transfer = await prisma.playerTransfer.findUnique({
      where: { id: params.id },
      include: {
        payment: true,
        oldTeam: true,
        newTeam: true,
        player: true,
      },
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer record not found' }, { status: 404 });

    const canPay = transfer.playerId === auth.userId || transfer.requesterId === auth.userId || auth.userId === transfer.newTeam.captainId;
    if (!canPay) {
      return NextResponse.json({ error: 'Forbidden: You are not authorized to submit payment for this transfer' }, { status: 403 });
    }

    if (!transfer.paymentId) {
      return NextResponse.json({ error: 'No associated payment order found for this transfer' }, { status: 400 });
    }

    const body = await req.json();
    const validated = transferPaymentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const updatedPayment = await submitPaymentProof({
      paymentId: transfer.paymentId,
      paymentMethod: validated.data.paymentMethod,
      transactionReference: validated.data.transactionReference,
      proofImageUrl: validated.data.proofImageUrl || undefined,
      remarks: validated.data.remarks || 'Transfer fee payment of PKR 100',
    });

    const updatedTransfer = await prisma.playerTransfer.update({
      where: { id: params.id },
      data: {
        status: 'PAYMENT_SUBMITTED',
        paidAt: new Date(),
      },
    });

    if (transfer.newTeam.captainId) {
      await prisma.notification.create({
        data: {
          userId: transfer.newTeam.captainId,
          title: 'Transfer Fee Paid',
          message: \`Transfer fee of PKR 100 paid for \${transfer.player.fullName}. Awaiting approvals and verification.\`,
          type: 'INFO',
        },
      });
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'TRANSFER_PAYMENT_SUBMITTED',
      entityType: 'PlayerTransfer',
      entityId: transfer.id,
      changes: {
        paymentId: transfer.paymentId,
        method: validated.data.paymentMethod,
        ref: validated.data.transactionReference,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer fee payment proof submitted successfully.',
      transfer: updatedTransfer,
      payment: updatedPayment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/transfers/[id]/pay/route.ts', payRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/transfers/[id]/pay/route.ts');
