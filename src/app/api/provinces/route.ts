import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const provinces = await prisma.province.findMany({
      include: {
        regions: {
          include: { cities: { where: { isActive: true } } },
        },
      },
    });
    return NextResponse.json({ provinces });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
