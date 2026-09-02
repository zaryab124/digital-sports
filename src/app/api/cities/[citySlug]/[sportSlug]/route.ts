import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { citySlug: string; sportSlug: string } }
) {
  try {
    const { citySlug, sportSlug } = params;

    // 1. Resolve City
    const city = await prisma.city.findFirst({
      where: { OR: [{ slug: citySlug }, { id: citySlug }, { code: citySlug.toUpperCase() }] },
      include: { region: true },
    });
    if (!city) return NextResponse.json({ error: 'City not found' }, { status: 404 });

    // 2. Resolve Sport
    const sport = await prisma.sport.findFirst({
      where: { OR: [{ slug: sportSlug }, { id: sportSlug }, { code: sportSlug.toUpperCase() }] },
      include: { category: true, rankingRules: true },
    });
    if (!sport) return NextResponse.json({ error: 'Sport not found' }, { status: 404 });

    // 3. Fetch City-Specific Teams for this Sport
    const teams = await prisma.team.findMany({
      where: { cityId: city.id, sportId: sport.id, status: 'ACTIVE' },
      include: {
        captain: { select: { id: true, fullName: true } },
        _count: { select: { members: { where: { status: 'ACTIVE' } } } },
      },
    });

    // 4. Fetch City-Specific Grounds hosting this Sport
    const allCityGrounds = await prisma.ground.findMany({
      where: { cityId: city.id, isActive: true },
    });
    const grounds = allCityGrounds.filter((g) => {
      try {
        const supported = JSON.parse(g.sportsSupported);
        return Array.isArray(supported) && (supported.includes(sport.code) || supported.includes(sport.id));
      } catch {
        return false;
      }
    });

    // 5. Fetch City Standings for this Sport
    const standings = await prisma.teamRanking.findMany({
      where: { cityId: city.id, sportId: sport.id },
      include: { team: true },
      orderBy: { rankPosition: 'asc' },
    });

    // 6. Fetch Upcoming and Recent Matches in this City for this Sport
    const matches = await prisma.match.findMany({
      where: { cityId: city.id, sportId: sport.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        ground: true,
        scorebook: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 8,
    });

    // 7. Top Athletes / Scorers in this City for this Sport
    const topPlayers = await prisma.playerRanking.findMany({
      where: { cityId: city.id, sportId: sport.id },
      include: {
        playerProfile: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { rankPosition: 'asc' },
      take: 5,
    });

    return NextResponse.json({
      city,
      sport,
      teams,
      grounds,
      standings,
      matches,
      topPlayers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
