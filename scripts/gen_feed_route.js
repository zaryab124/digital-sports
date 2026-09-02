const fs = require('fs');
fs.mkdirSync('src/app/api/community/[cityId]/feed', { recursive: true });

const feedRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const cityId = params.cityId;

    // 1. Resolve City by ID or Slug
    let city = await prisma.city.findFirst({
      where: {
        OR: [{ id: cityId }, { slug: cityId }, { code: cityId.toUpperCase() }],
      },
      include: {
        region: { include: { province: true } },
        community: true,
        grounds: { where: { isActive: true } },
      },
    });

    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    const resolvedCityId = city.id;

    // 2. Fetch Aggregated Community Feed Data in Parallel
    const [
      upcomingMatches,
      recentResults,
      teamRankings,
      playerRankings,
      winningPhotos,
      announcements,
      featuredTeams,
      featuredPlayers,
    ] = await Promise.all([
      // A. Upcoming Matches (SCHEDULED, APPROVED, LIVE)
      prisma.match.findMany({
        where: {
          cityId: resolvedCityId,
          status: { in: ['SCHEDULED', 'APPROVED', 'LIVE'] },
        },
        include: {
          sport: true,
          ground: true,
          homeTeam: { select: { id: true, name: true, code: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, code: true, logoUrl: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
      }),

      // B. Recent Results (OFFICIAL locked matches)
      prisma.match.findMany({
        where: {
          cityId: resolvedCityId,
          isLocked: true,
          status: { in: ['OFFICIAL', 'OFFICIAL_VERIFIED'] },
        },
        include: {
          sport: true,
          ground: true,
          homeTeam: { select: { id: true, name: true, code: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, code: true, logoUrl: true } },
          winnerTeam: { select: { id: true, name: true } },
          photos: { where: { status: 'APPROVED' }, take: 1 },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 6,
      }),

      // C. Team Rankings for City
      prisma.teamRanking.findMany({
        where: { cityId: resolvedCityId },
        include: {
          team: {
            include: {
              teamStats: true,
            },
          },
          sport: true,
        },
        orderBy: [{ points: 'desc' }, { goalDiffOrNrr: 'desc' }, { rankPosition: 'asc' }],
        take: 8,
      }),

      // D. Player Rankings for City
      prisma.playerRanking.findMany({
        where: { cityId: resolvedCityId },
        include: {
          playerProfile: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true } },
              statistics: true,
            },
          },
          sport: true,
        },
        orderBy: [{ performanceRating: 'desc' }, { rankPosition: 'asc' }],
        take: 8,
      }),

      // E. Winning Photos (APPROVED)
      prisma.matchPhoto.findMany({
        where: {
          cityId: resolvedCityId,
          status: 'APPROVED',
        },
        include: {
          team: { select: { id: true, name: true, code: true, logoUrl: true } },
          sport: { select: { id: true, name: true } },
          uploader: { select: { id: true, fullName: true, avatarUrl: true } },
          match: {
            select: {
              id: true,
              homeScore: true,
              awayScore: true,
              scheduledAt: true,
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),

      // F. Announcements & Community Posts
      city.community
        ? prisma.communityPost.findMany({
            where: { communityId: city.community.id },
            include: {
              author: { select: { id: true, fullName: true, avatarUrl: true } },
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            take: 10,
          })
        : Promise.resolve([]),

      // G. Featured Teams (Top Active Squads)
      prisma.team.findMany({
        where: {
          cityId: resolvedCityId,
          status: 'ACTIVE',
        },
        include: {
          sport: true,
          teamStats: true,
          captain: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 4,
      }),

      // H. Featured Players (Elite/Advanced Athletes)
      prisma.playerProfile.findMany({
        where: {
          user: { homeCityId: resolvedCityId },
        },
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
          primarySport: true,
          statistics: true,
        },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      city: {
        id: city.id,
        name: city.name,
        slug: city.slug,
        code: city.code,
        description: city.description,
        imageUrl: city.imageUrl,
        province: city.region?.province?.name || 'Punjab',
        region: city.region?.name || 'South Punjab',
        grounds: city.grounds,
        communityTitle: city.community?.name || (city.name + ' Sports Community'),
        communityDescription: city.community?.description,
      },
      upcomingMatches,
      recentResults,
      teamRankings,
      playerRankings,
      winningPhotos,
      announcements,
      featuredTeams,
      featuredPlayers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/community/[cityId]/feed/route.ts', feedRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/community/[cityId]/feed/route.ts');
