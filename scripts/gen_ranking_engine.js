const fs = require('fs');

const rankingEngineCode = `import { prisma } from '../lib/prisma';

export async function recalculateRankings(sportId: string, cityId: string, regionId?: string) {
  // 1. Fetch Admin-Configurable Ranking Rules for Sport
  const rankingRule = await prisma.rankingRule.findUnique({
    where: { sportId },
  });

  const winPts = rankingRule?.winPoints ?? 3;
  const drawPts = rankingRule?.drawPoints ?? 1;
  const lossPts = rankingRule?.lossPoints ?? 0;

  // -------------------------------------------------------------
  // A. CITY-LEVEL TEAM RANKINGS
  // -------------------------------------------------------------
  const cityTeams = await prisma.team.findMany({
    where: {
      sportId,
      cityId,
      status: 'ACTIVE',
    },
    include: {
      teamStats: {
        where: { sportId },
      },
      matchStats: {
        where: {
          match: {
            sportId,
            isLocked: true,
          },
        },
      },
    },
  });

  const sortedCityTeams = cityTeams.map((team) => {
    let played = 0;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let scoreFor = 0;
    let scoreAgainst = 0;

    for (const ms of team.matchStats) {
      played++;
      if (ms.result === 'WIN') wins++;
      else if (ms.result === 'LOSS') losses++;
      else if (ms.result === 'DRAW') draws++;

      const det = typeof ms.statsJson === 'string' ? JSON.parse(ms.statsJson || '{}') : ms.statsJson || {};
      scoreFor += Number(det.score || 0);
      scoreAgainst += Number(det.opponentScore || 0);
    }

    const points = (wins * winPts) + (draws * drawPts) + (losses * lossPts);
    const goalDiffOrNrr = scoreFor - scoreAgainst;
    const rankScore = Math.max(100, 100 + (wins * 30) + (draws * 10) + (goalDiffOrNrr * 2) - (losses * 15));

    return {
      team,
      played,
      wins,
      losses,
      draws,
      points,
      goalDiffOrNrr,
      rankScore,
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiffOrNrr !== a.goalDiffOrNrr) return b.goalDiffOrNrr - a.goalDiffOrNrr;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.rankScore - a.rankScore;
  });

  for (let i = 0; i < sortedCityTeams.length; i++) {
    const item = sortedCityTeams[i];
    await prisma.teamRanking.upsert({
      where: {
        teamId_sportId_cityId: {
          teamId: item.team.id,
          sportId,
          cityId,
        },
      },
      update: {
        regionId: regionId || undefined,
        rankPosition: i + 1,
        points: item.points,
        goalDiffOrNrr: item.goalDiffOrNrr,
      },
      create: {
        teamId: item.team.id,
        sportId,
        cityId,
        regionId: regionId || undefined,
        rankPosition: i + 1,
        points: item.points,
        goalDiffOrNrr: item.goalDiffOrNrr,
      },
    });
  }

  // -------------------------------------------------------------
  // B. REGIONAL TEAM RANKINGS (Cross-City Standings)
  // -------------------------------------------------------------
  if (regionId) {
    const regionalTeams = await prisma.team.findMany({
      where: {
        sportId,
        city: { regionId },
        status: 'ACTIVE',
      },
      include: {
        matchStats: {
          where: {
            match: {
              sportId,
              isLocked: true,
            },
          },
        },
      },
    });

    const sortedRegionalTeams = regionalTeams.map((team) => {
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let scoreFor = 0;
      let scoreAgainst = 0;

      for (const ms of team.matchStats) {
        if (ms.result === 'WIN') wins++;
        else if (ms.result === 'LOSS') losses++;
        else if (ms.result === 'DRAW') draws++;
        const det = typeof ms.statsJson === 'string' ? JSON.parse(ms.statsJson || '{}') : ms.statsJson || {};
        scoreFor += Number(det.score || 0);
        scoreAgainst += Number(det.opponentScore || 0);
      }

      const points = (wins * winPts) + (draws * drawPts) + (losses * lossPts);
      const goalDiffOrNrr = scoreFor - scoreAgainst;
      return { team, points, goalDiffOrNrr, wins };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiffOrNrr !== a.goalDiffOrNrr) return b.goalDiffOrNrr - a.goalDiffOrNrr;
      return b.wins - a.wins;
    });

    for (let i = 0; i < sortedRegionalTeams.length; i++) {
      const item = sortedRegionalTeams[i];
      // Update existing or create regional ranking record
      await prisma.teamRanking.updateMany({
        where: {
          teamId: item.team.id,
          sportId,
        },
        data: {
          regionId,
        },
      });
    }
  }

  // -------------------------------------------------------------
  // C. CITY-LEVEL PLAYER RANKINGS & LEADERBOARDS
  // -------------------------------------------------------------
  const cityPlayers = await prisma.playerProfile.findMany({
    where: {
      user: {
        homeCityId: cityId,
      },
      statistics: {
        some: { sportId },
      },
    },
    include: {
      statistics: {
        where: { sportId },
      },
    },
  });

  const sortedCityPlayers = cityPlayers.sort((a, b) => {
    const statsA = a.statistics[0] || { ratingScore: 100, mvpCount: 0 };
    const statsB = b.statistics[0] || { ratingScore: 100, mvpCount: 0 };
    if (statsB.ratingScore !== statsA.ratingScore) return statsB.ratingScore - statsA.ratingScore;
    return (statsB.mvpCount || 0) - (statsA.mvpCount || 0);
  });

  for (let i = 0; i < sortedCityPlayers.length; i++) {
    const player = sortedCityPlayers[i];
    const stats = player.statistics[0] || { ratingScore: 100 };
    await prisma.playerRanking.upsert({
      where: {
        playerId_sportId_cityId: {
          playerId: player.userId,
          sportId,
          cityId,
        },
      },
      update: {
        regionId: regionId || undefined,
        rankPosition: i + 1,
        points: stats.ratingScore,
        performanceRating: stats.ratingScore,
      },
      create: {
        playerId: player.userId,
        sportId,
        cityId,
        regionId: regionId || undefined,
        rankPosition: i + 1,
        points: stats.ratingScore,
        performanceRating: stats.ratingScore,
      },
    });
  }
}
`;

fs.writeFileSync('src/services/ranking-engine.ts', rankingEngineCode.trim() + '\n', 'utf8');
console.log('[OK] Updated src/services/ranking-engine.ts');
