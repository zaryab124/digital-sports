import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      include: {
        province: true,
        cities: { where: { isActive: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ regions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
