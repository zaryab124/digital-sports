import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canManageCity } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');

    const grounds = await prisma.ground.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        isActive: true,
      },
      include: { city: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ grounds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { cityId, name, address, sportsSupported, capacity } = body;

    if (!cityId || !name || !address) {
      return NextResponse.json({ error: 'Missing required ground fields' }, { status: 400 });
    }

    if (!canManageCity(auth, cityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ground = await prisma.ground.create({
      data: {
        cityId,
        name,
        address,
        sportsSupported: Array.isArray(sportsSupported) ? sportsSupported.join(',') : (sportsSupported || 'CRICKET,FOOTBALL'),
        capacity: capacity ? parseInt(capacity) : 500,
      },
      include: { city: true },
    });

    return NextResponse.json({ success: true, ground }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
