import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { submitPaymentSchema } from '@/lib/validations';
import { submitPaymentProof } from '@/services/payment-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (team.captainId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden: Only team captain can submit registration payment' }, { status: 403 });
    }

    const body = await req.json();
    const validated = submitPaymentSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updatedPayment = await submitPaymentProof({
      paymentId: validated.data.paymentId,
      paymentMethod: validated.data.paymentMethod,
      transactionReference: validated.data.transactionReference,
      proofImageUrl: validated.data.proofImageUrl,
      remarks: validated.data.remarks,
    });

    const updatedTeam = await prisma.team.update({
      where: { id: params.id },
      data: { status: 'PAYMENT_SUBMITTED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted. Team registration is now awaiting administrative approval.',
      team: updatedTeam,
      payment: updatedPayment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
