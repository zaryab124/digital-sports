import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const scorebook = await prisma.scorebook.findUnique({
      where: { matchId: params.matchId },
      include: {
        match: {
          include: {
            homeTeam: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } } },
            awayTeam: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } } },
            sport: true,
            ground: true,
            officials: { include: { official: true } },
          },
        },
        events: { orderBy: { createdAt: 'asc' } },
        submittedBy: { select: { id: true, fullName: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!scorebook) return NextResponse.json({ error: 'Scorebook not found' }, { status: 404 });
    return NextResponse.json({ scorebook });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
