import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/matches/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        sport: { include: { rankingRules: true } },
        city: true,
        ground: true,
        homeTeam: { include: { captain: true } },
        awayTeam: { include: { captain: true } },
        participants: { include: { player: true } },
        officials: { include: { official: true } },
        scorebook: { include: { events: { orderBy: { createdAt: 'asc' } } } },
        playerStats: true,
        teamStats: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ match });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
