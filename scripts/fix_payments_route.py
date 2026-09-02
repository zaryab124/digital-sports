import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/payments/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';
import { submitPaymentSchema } from '@/lib/validations';
import { submitPaymentProof } from '@/services/payment-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');

    const isAdmin = isSuperAdmin(auth) || hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN]);

    const payments = await prisma.payment.findMany({
      where: {
        ...(isAdmin ? {} : { userId: auth.userId }),
        ...(status ? { status } : {}),
        ...(paymentType ? { paymentType } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        team: true,
        sport: true,
        city: true,
        transactions: { orderBy: { createdAt: 'desc' } },
        verifications: { include: { verifiedBy: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = submitPaymentSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const result = await submitPaymentProof({
      ...validated.data,
      userId: auth.userId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
