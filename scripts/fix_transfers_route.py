import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/transfers/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createTransferSchema } from '@/lib/validations';
import { createTransferRequest } from '@/services/payment-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const cityId = searchParams.get('cityId');

    const isAdmin = isSuperAdmin(auth) || (cityId && isCityAdmin(auth, cityId));

    const where: any = {};
    if (!isAdmin) where.playerId = auth.userId;
    if (status) where.status = status;
    if (cityId) where.cityId = cityId;

    const transfers = await prisma.playerTransfer.findMany({
      where,
      include: {
        player: { select: { id: true, fullName: true, avatarUrl: true } },
        oldTeam: true,
        newTeam: true,
        sport: true,
        city: true,
        payment: true,
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
    const validated = createTransferSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const result = await createTransferRequest({
      playerId: auth.userId,
      ...validated.data,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
