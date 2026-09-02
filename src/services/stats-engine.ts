import { prisma } from '../lib/prisma';
import { calculateScorebookState } from './scorebook-engine';
import { recalculateRankings } from './ranking-engine';

/**
 * Algorithmic Category Generator
 * Categories are computed deterministically from sport-specific rating thresholds and milestones
 */
export function calculatePerformanceCategory(
  sportCode: string,
  ratingScore: number,
  goals = 0,
  runs = 0,
  wickets = 0,
  points = 0,
  frames = 0
): string {
  const code = (sportCode || '').toUpperCase();

  // Elite Tier
  if (ratingScore >= 750 || goals >= 15 || runs >= 500 || wickets >= 20 || points >= 200 || frames >= 20) {
    return 'ELITE';
  }

  // Excellent Tier
  if (ratingScore >= 500 || goals >= 10 || runs >= 300 || wickets >= 12 || points >= 120 || frames >= 12) {
    return 'EXCELLENT';
  }

  // Advanced Tier
  if (ratingScore >= 320 || goals >= 5 || runs >= 150 || wickets >= 6 || points >= 60 || frames >= 6) {
    return 'ADVANCED';
  }

  // Intermediate Tier
  if (ratingScore >= 180 || goals >= 2 || runs >= 50 || wickets >= 2 || points >= 25 || frames >= 2) {
    return 'INTERMEDIATE';
  }

  // Developing Tier (Default entry level)
  return 'DEVELOPING';
}

/**
 * Main Match Statistics Processor
 * Triggered ONLY upon official match locking
 */
export async function processMatchFinalStatistics(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      sport: true,
      city: { include: { region: true } },
      homeTeam: true,
      awayTeam: true,
      scorebook: {
        include: {
          events: true,
        },
      },
      participants: true,
    },
  });

  if (!match || !match.scorebook) {
    throw new Error('Match or Scorebook not found');
  }

  const { sport, homeTeam, awayTeam, scorebook, participants, city } = match;
  const events = scorebook.events;

  // 1. Calculate Scorebook State
  const calculated = calculateScorebookState(sport.code, homeTeam.id, awayTeam.id, events);

  // 2. Lock Match & Set Official Status
  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: calculated.homeScore,
      awayScore: calculated.awayScore,
      winnerTeamId: calculated.winnerTeamId,
      status: 'OFFICIAL',
      isLocked: true,
      lockedAt: new Date(),
    },
  });

  // 3. Process Team Match Statistics
  const homeResult = calculated.winnerTeamId === homeTeam.id ? 'WIN' : calculated.winnerTeamId === awayTeam.id ? 'LOSS' : 'DRAW';
  const awayResult = calculated.winnerTeamId === awayTeam.id ? 'WIN' : calculated.winnerTeamId === homeTeam.id ? 'LOSS' : 'DRAW';

  await prisma.teamMatchStatistic.upsert({
    where: { matchId_teamId: { matchId, teamId: homeTeam.id } },
    update: {
      statsJson: JSON.stringify({ score: calculated.homeScore, opponentScore: calculated.awayScore }),
      result: homeResult,
    },
    create: {
      matchId,
      teamId: homeTeam.id,
      statsJson: JSON.stringify({ score: calculated.homeScore, opponentScore: calculated.awayScore }),
      result: homeResult,
    },
  });

  await prisma.teamMatchStatistic.upsert({
    where: { matchId_teamId: { matchId, teamId: awayTeam.id } },
    update: {
      statsJson: JSON.stringify({ score: calculated.awayScore, opponentScore: calculated.homeScore }),
      result: awayResult,
    },
    create: {
      matchId,
      teamId: awayTeam.id,
      statsJson: JSON.stringify({ score: calculated.awayScore, opponentScore: calculated.homeScore }),
      result: awayResult,
    },
  });

  // 4. Process Player Match Statistics & MVP
  let mvpPlayerId: string | null = null;
  let highestImpact = -1;

  for (const p of participants) {
    let pGoals = 0;
    let pAssists = 0;
    let pRuns = 0;
    let pWickets = 0;
    let pPoints = 0;
    let pAces = 0;
    let pFrames = 0;

    for (const ev of events) {
      const det = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson || {};

      if (ev.playerId === p.playerId) {
        if (ev.eventType === 'GOAL') pGoals++;
        if (ev.eventType === 'POINT') pPoints++;
        if (ev.eventType === 'ACE') pAces++;
        if (ev.eventType === 'FRAME_WON') pFrames++;
        if (det.runs) pRuns += Number(det.runs);
      }

      if (det.assistPlayerId === p.playerId) pAssists++;
      if (det.bowlerId === p.playerId && (ev.eventType === 'WICKET' || det.isWicket)) {
        pWickets++;
      }
    }

    const impact = (pGoals * 50) + (pAssists * 25) + (pRuns * 2) + (pWickets * 35) + (pPoints * 10) + (pAces * 15) + (pFrames * 40);
    if (impact > highestImpact && impact > 0) {
      highestImpact = impact;
      mvpPlayerId = p.playerId;
    }

    const playerMatchStats = {
      goals: pGoals,
      assists: pAssists,
      runs: pRuns,
      wickets: pWickets,
      points: pPoints,
      aces: pAces,
      frames: pFrames,
      impact,
    };

    await prisma.playerMatchStatistic.upsert({
      where: { matchId_playerId: { matchId, playerId: p.playerId } },
      update: {
        statsJson: JSON.stringify(playerMatchStats),
        isMvp: false,
      },
      create: {
        matchId,
        playerId: p.playerId,
        teamId: p.teamId,
        sportId: sport.id,
        statsJson: JSON.stringify(playerMatchStats),
        isMvp: false,
      },
    });
  }

  // Tag MVP
  if (mvpPlayerId) {
    await prisma.playerMatchStatistic.update({
      where: { matchId_playerId: { matchId, playerId: mvpPlayerId } },
      data: { isMvp: true },
    });
  }

  // 5. Update Cumulative Player Statistics for all participants (Only from LOCKED matches)
  for (const p of participants) {
    await recalculatePlayerCumulativeStats(p.playerId, sport.id, sport.code);
  }

  // 6. Update Cumulative Team Statistics for both squads
  await recalculateTeamCumulativeStats(homeTeam.id, sport.id);
  await recalculateTeamCumulativeStats(awayTeam.id, sport.id);

  // 7. Update Municipal & Regional Rankings
  await recalculateRankings(sport.id, city.id, city.regionId || undefined);

  return { success: true, calculated, mvpPlayerId };
}

export async function recalculatePlayerCumulativeStats(playerId: string, sportId: string, sportCode?: string) {
  // STRICT RULE: Query only OFFICIAL LOCKED matches
  const matchStats = await prisma.playerMatchStatistic.findMany({
    where: {
      playerId,
      sportId,
      match: {
        isLocked: true,
      },
    },
    include: {
      match: true,
    },
  });

  const matchesPlayed = matchStats.length;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let goals = 0;
  let assists = 0;
  let runs = 0;
  let wickets = 0;
  let points = 0;
  let frames = 0;
  let mvpCount = 0;

  for (const ms of matchStats) {
    if (ms.isMvp) mvpCount++;
    const data = typeof ms.statsJson === 'string' ? JSON.parse(ms.statsJson || '{}') : ms.statsJson || {};
    goals += Number(data.goals || 0);
    assists += Number(data.assists || 0);
    runs += Number(data.runs || 0);
    wickets += Number(data.wickets || 0);
    points += Number(data.points || 0);
    frames += Number(data.frames || 0);

    const winner = ms.match.winnerTeamId;
    if (winner === ms.teamId) wins++;
    else if (!winner) draws++;
    else losses++;
  }

  // Sport-specific performance rating formula
  const code = (sportCode || '').toUpperCase();
  let sportMultiplier = 0;
  if (code === 'CRICKET') {
    sportMultiplier = (runs * 1.5) + (wickets * 20);
  } else if (code === 'FOOTBALL') {
    sportMultiplier = (goals * 30) + (assists * 15);
  } else if (code === 'VOLLEYBALL' || code === 'BADMINTON' || code === 'TABLE_TENNIS') {
    sportMultiplier = points * 4;
  } else if (code === 'SNOOKER') {
    sportMultiplier = frames * 25;
  } else {
    sportMultiplier = (goals * 20) + (runs * 1.5) + (points * 5);
  }

  const ratingScore = Math.max(
    100,
    100 + (wins * 25) + (draws * 10) + (mvpCount * 40) + sportMultiplier - (losses * 10)
  );

  const performanceCategory = calculatePerformanceCategory(code, ratingScore, goals, runs, wickets, points, frames);

  await prisma.playerProfile.upsert({
    where: { userId: playerId },
    update: { performanceCategory },
    create: {
      userId: playerId,
      primarySportId: sportId,
      performanceCategory,
    },
  });

  await prisma.playerStatistic.upsert({
    where: { playerId_sportId: { playerId, sportId } },
    update: {
      matchesPlayed,
      wins,
      losses,
      draws,
      goals,
      assists,
      runs,
      wickets,
      points,
      mvpCount,
      ratingScore,
      performanceCategory,
    },
    create: {
      playerId,
      sportId,
      matchesPlayed,
      wins,
      losses,
      draws,
      goals,
      assists,
      runs,
      wickets,
      points,
      mvpCount,
      ratingScore,
      performanceCategory,
    },
  });
}

export async function recalculateTeamCumulativeStats(teamId: string, sportId: string) {
  // STRICT RULE: Query only OFFICIAL LOCKED matches
  const teamMatches = await prisma.teamMatchStatistic.findMany({
    where: {
      teamId,
      match: {
        sportId,
        isLocked: true,
      },
    },
  });

  const matchesPlayed = teamMatches.length;
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const tm of teamMatches) {
    if (tm.result === 'WIN') wins++;
    else if (tm.result === 'LOSS') losses++;
    else if (tm.result === 'DRAW') draws++;
  }

  const points = (wins * 3) + (draws * 1);
  const rankScore = Math.max(100, 100 + (wins * 30) + (draws * 10) - (losses * 15));

  await prisma.teamStatistic.upsert({
    where: { teamId_sportId: { teamId, sportId } },
    update: {
      matchesPlayed,
      wins,
      losses,
      draws,
      points,
      rankScore,
    },
    create: {
      teamId,
      sportId,
      matchesPlayed,
      wins,
      losses,
      draws,
      points,
      rankScore,
    },
  });
}
