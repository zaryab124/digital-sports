import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canVerifyPayments } from '@/lib/rbac';
import { verifyPaymentSchema } from '@/lib/validations';
import { verifyPayment } from '@/services/payment-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payment = await prisma.payment.findUnique({ where: { id: params.id } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    if (!isSuperAdmin(auth) && !canVerifyPayments(auth, payment.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Admin verification privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const validated = verifyPaymentSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updated = await verifyPayment({
      paymentId: payment.id,
      verifiedById: auth.userId,
      action: validated.data.action,
      rejectionReason: validated.data.rejectionReason,
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
