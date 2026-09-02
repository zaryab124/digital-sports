import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get('sportId');
    const sportSlug = searchParams.get('sportSlug');
    const cityId = searchParams.get('cityId');
    const citySlug = searchParams.get('citySlug');
    const regionId = searchParams.get('regionId');
    const type = searchParams.get('type') || 'TEAMS'; // 'TEAMS' | 'PLAYERS' | 'CITIES' | 'REGIONAL'

    // 1. Resolve Sport
    let resolvedSportId = sportId;
    if (!resolvedSportId && sportSlug && sportSlug !== 'ALL') {
      const sp = await prisma.sport.findUnique({ where: { slug: sportSlug } });
      if (sp) resolvedSportId = sp.id;
    }

    // 2. Resolve City
    let resolvedCityId = cityId;
    if (!resolvedCityId && citySlug && citySlug !== 'ALL') {
      const ct = await prisma.city.findUnique({ where: { slug: citySlug } });
      if (ct) resolvedCityId = ct.id;
    }

    // --- TYPE 1: TEAM RANKINGS & STANDINGS ---
    if (type === 'TEAMS') {
      const where: any = {};
      if (resolvedSportId && resolvedSportId !== 'ALL') where.sportId = resolvedSportId;
      if (resolvedCityId && resolvedCityId !== 'ALL') where.cityId = resolvedCityId;
      if (regionId && regionId !== 'ALL') where.regionId = regionId;

      const teamRankings = await prisma.teamRanking.findMany({
        where,
        include: {
          team: {
            include: {
              city: true,
              captain: { select: { id: true, fullName: true } },
              teamStats: true,
            },
          },
          sport: true,
          city: true,
        },
        orderBy: [{ points: 'desc' }, { goalDiffOrNrr: 'desc' }, { rankPosition: 'asc' }],
        take: 100,
      });

      return NextResponse.json({
        type: 'TEAMS',
        rankings: teamRankings.map((r, idx) => ({
          id: r.id,
          rankPosition: idx + 1,
          teamId: r.teamId,
          teamName: r.team.name,
          teamCode: r.team.code,
          logoUrl: r.team.logoUrl,
          city: r.city?.name || r.team.city?.name,
          sport: r.sport.name,
          points: r.points,
          goalDiffOrNrr: r.goalDiffOrNrr,
          matchesPlayed: r.team.teamStats[0]?.matchesPlayed || 0,
          wins: r.team.teamStats[0]?.wins || 0,
          losses: r.team.teamStats[0]?.losses || 0,
          draws: r.team.teamStats[0]?.draws || 0,
          updatedAt: r.updatedAt,
        })),
      });
    }

    // --- TYPE 2: PLAYER RANKINGS & LEADERBOARDS ---
    if (type === 'PLAYERS') {
      const where: any = {};
      if (resolvedSportId && resolvedSportId !== 'ALL') where.sportId = resolvedSportId;
      if (resolvedCityId && resolvedCityId !== 'ALL') where.cityId = resolvedCityId;

      const playerRankings = await prisma.playerRanking.findMany({
        where,
        include: {
          playerProfile: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true, homeCity: true } },
              statistics: true,
            },
          },
          sport: true,
          city: true,
        },
        orderBy: [{ performanceRating: 'desc' }, { rankPosition: 'asc' }],
        take: 100,
      });

      return NextResponse.json({
        type: 'PLAYERS',
        rankings: playerRankings.map((r, idx) => {
          const stats = r.playerProfile.statistics.find((s) => s.sportId === r.sportId) || r.playerProfile.statistics[0];
          return {
            id: r.id,
            rankPosition: idx + 1,
            playerId: r.playerId,
            fullName: r.playerProfile.user.fullName,
            avatarUrl: r.playerProfile.user.avatarUrl,
            city: r.city?.name || r.playerProfile.user.homeCity?.name,
            sport: r.sport.name,
            performanceRating: r.performanceRating,
            performanceCategory: stats?.performanceCategory || r.playerProfile.performanceCategory || 'DEVELOPING',
            matchesPlayed: stats?.matchesPlayed || 0,
            goals: stats?.goals || 0,
            assists: stats?.assists || 0,
            runs: stats?.runs || 0,
            wickets: stats?.wickets || 0,
            points: stats?.points || 0,
            mvpCount: stats?.mvpCount || 0,
            updatedAt: r.updatedAt,
          };
        }),
      });
    }

    // --- TYPE 3: CITY & REGIONAL LEADERBOARDS ---
    if (type === 'CITIES' || type === 'REGIONAL') {
      const cities = await prisma.city.findMany({
        include: {
          teams: { where: { status: 'ACTIVE' }, select: { id: true } },
          matches: { where: { isLocked: true }, select: { id: true } },
          region: { include: { province: true } },
        },
      });

      const cityRankings = cities.map((c) => ({
        cityId: c.id,
        cityName: c.name,
        citySlug: c.slug,
        province: c.region?.province?.name || 'Punjab',
        region: c.region?.name || 'South Punjab',
        activeClubs: c.teams.length,
        officialMatchesPlayed: c.matches.length,
        championshipPoints: (c.teams.length * 10) + (c.matches.length * 25),
      })).sort((a, b) => b.championshipPoints - a.championshipPoints);

      return NextResponse.json({
        type: 'CITIES',
        rankings: cityRankings.map((cr, idx) => ({
          rankPosition: idx + 1,
          ...cr,
        })),
      });
    }

    return NextResponse.json({ error: 'Invalid ranking type requested' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
