import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET() {
  try {
    const fees = await prisma.feeConfiguration.findMany({
      include: { sport: true, city: true },
      orderBy: { feeType: 'asc' },
    });
    return NextResponse.json({ fees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized: Super Admin required' }, { status: 403 });

    const body = await req.json();
    const { id, amount, isActive, description } = body;

    const updated = await prisma.feeConfiguration.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        isActive: isActive !== undefined ? isActive : true,
        description,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'FEE_CONFIGURATION_UPDATED',
      entityType: 'FeeConfiguration',
      entityId: updated.id,
      changes: { amount, isActive, description },
    });

    return NextResponse.json({ success: true, fee: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
