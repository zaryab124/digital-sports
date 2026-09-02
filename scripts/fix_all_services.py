import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/services/scorebook-engine.ts', """export interface ScorebookState {
  sportCode: string;
  isComplete: boolean;
  homeScore: number;
  awayScore: number;
  winnerTeamId?: string | null;
  summary: string;
  details: Record<string, any>;
}

export interface ScoreEventPayload {
  eventType: string;
  teamId: string;
  playerId?: string;
  minuteOrBall?: string;
  setOrInnings?: number;
  detailsJson?: string;
}

export function calculateScorebookState(
  sportCode: string,
  homeTeamId: string,
  awayTeamId: string,
  events: any[]
): ScorebookState {
  switch (sportCode.toUpperCase()) {
    case 'FOOTBALL': {
      let homeGoals = 0;
      let awayGoals = 0;
      const playerGoals: Record<string, number> = {};
      const playerCards: Record<string, { yellow: number; red: number }> = {};

      for (const ev of events) {
        if (ev.eventType === 'GOAL') {
          if (ev.teamId === homeTeamId) homeGoals++;
          else if (ev.teamId === awayTeamId) awayGoals++;

          if (ev.playerId) {
            playerGoals[ev.playerId] = (playerGoals[ev.playerId] || 0) + 1;
          }
        } else if (ev.eventType === 'CARD') {
          if (ev.playerId) {
            if (!playerCards[ev.playerId]) playerCards[ev.playerId] = { yellow: 0, red: 0 };
            const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson;
            if (details.cardType === 'RED') playerCards[ev.playerId].red++;
            else playerCards[ev.playerId].yellow++;
          }
        }
      }

      let winner: string | null = null;
      if (homeGoals > awayGoals) winner = homeTeamId;
      else if (awayGoals > homeGoals) winner = awayTeamId;

      return {
        sportCode: 'FOOTBALL',
        isComplete: true,
        homeScore: homeGoals,
        awayScore: awayGoals,
        winnerTeamId: winner,
        summary: `Full Time: ${homeGoals} - ${awayGoals}`,
        details: { playerGoals, playerCards },
      };
    }

    case 'CRICKET': {
      let homeRuns = 0;
      let awayRuns = 0;
      let homeWickets = 0;
      let awayWickets = 0;
      let homeBalls = 0;
      let awayBalls = 0;

      const batsmanStats: Record<string, { runs: number; balls: number; fours: number; sixes: number }> = {};
      const bowlerStats: Record<string, { balls: number; runsGiven: number; wickets: number }> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson;
        const runs = details.runs || 0;
        const isWicket = ev.eventType === 'WICKET' || details.isWicket;
        const bowlerId = details.bowlerId;

        if (ev.teamId === homeTeamId) {
          homeRuns += runs;
          homeBalls++;
          if (isWicket) homeWickets++;
        } else {
          awayRuns += runs;
          awayBalls++;
          if (isWicket) awayWickets++;
        }

        if (ev.playerId) {
          if (!batsmanStats[ev.playerId]) batsmanStats[ev.playerId] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
          batsmanStats[ev.playerId].runs += runs;
          batsmanStats[ev.playerId].balls += 1;
          if (runs === 4) batsmanStats[ev.playerId].fours++;
          if (runs === 6) batsmanStats[ev.playerId].sixes++;
        }

        if (bowlerId) {
          if (!bowlerStats[bowlerId]) bowlerStats[bowlerId] = { balls: 0, runsGiven: 0, wickets: 0 };
          bowlerStats[bowlerId].balls++;
          bowlerStats[bowlerId].runsGiven += runs;
          if (isWicket) bowlerStats[bowlerId].wickets++;
        }
      }

      let winner: string | null = null;
      if (homeRuns > awayRuns) winner = homeTeamId;
      else if (awayRuns > homeRuns) winner = awayTeamId;

      return {
        sportCode: 'CRICKET',
        isComplete: true,
        homeScore: homeRuns,
        awayScore: awayRuns,
        winnerTeamId: winner,
        summary: `Team A: ${homeRuns}/${homeWickets} (${Math.floor(homeBalls / 6)}.${homeBalls % 6} ov) vs Team B: ${awayRuns}/${awayWickets} (${Math.floor(awayBalls / 6)}.${awayBalls % 6} ov)`,
        details: { homeWickets, awayWickets, homeBalls, awayBalls, batsmanStats, bowlerStats },
      };
    }

    case 'VOLLEYBALL': {
      let homeSets = 0;
      let awaySets = 0;
      let homePoints = 0;
      let awayPoints = 0;
      const playerPoints: Record<string, { points: number; aces: number; blocks: number }> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson;
        if (ev.eventType === 'POINT' || ev.eventType === 'ACE' || ev.eventType === 'BLOCK') {
          if (ev.teamId === homeTeamId) homePoints++;
          else awayPoints++;

          if (ev.playerId) {
            if (!playerPoints[ev.playerId]) playerPoints[ev.playerId] = { points: 0, aces: 0, blocks: 0 };
            playerPoints[ev.playerId].points++;
            if (ev.eventType === 'ACE') playerPoints[ev.playerId].aces++;
            if (ev.eventType === 'BLOCK') playerPoints[ev.playerId].blocks++;
          }
        } else if (ev.eventType === 'SET_WON') {
          if (ev.teamId === homeTeamId) homeSets++;
          else awaySets++;
        }
      }

      if (homeSets === 0 && awaySets === 0) {
        if (homePoints > awayPoints) homeSets = 1;
        else if (awayPoints > homePoints) awaySets = 1;
      }

      let winner: string | null = null;
      if (homeSets > awaySets) winner = homeTeamId;
      else if (awaySets > homeSets) winner = awayTeamId;

      return {
        sportCode: 'VOLLEYBALL',
        isComplete: true,
        homeScore: homeSets,
        awayScore: awaySets,
        winnerTeamId: winner,
        summary: `Sets: ${homeSets} - ${awaySets} (Points: ${homePoints} - ${awayPoints})`,
        details: { homePoints, awayPoints, playerPoints },
      };
    }

    case 'BADMINTON':
    case 'TABLE_TENNIS': {
      let homeGames = 0;
      let awayGames = 0;
      let homePoints = 0;
      let awayPoints = 0;

      for (const ev of events) {
        if (ev.eventType === 'POINT') {
          if (ev.teamId === homeTeamId) homePoints++;
          else awayPoints++;
        } else if (ev.eventType === 'GAME_WON') {
          if (ev.teamId === homeTeamId) homeGames++;
          else awayGames++;
        }
      }

      if (homeGames === 0 && awayGames === 0) {
        if (homePoints > awayPoints) homeGames = 1;
        else if (awayPoints > homePoints) awayGames = 1;
      }

      let winner: string | null = null;
      if (homeGames > awayGames) winner = homeTeamId;
      else if (awayGames > homeGames) winner = awayTeamId;

      return {
        sportCode,
        isComplete: true,
        homeScore: homeGames,
        awayScore: awayGames,
        winnerTeamId: winner,
        summary: `Games: ${homeGames} - ${awayGames} (${homePoints} - ${awayPoints} pts)`,
        details: { homePoints, awayPoints },
      };
    }

    case 'SNOOKER': {
      let homeFrames = 0;
      let awayFrames = 0;
      let homeFramePoints = 0;
      let awayFramePoints = 0;
      const breaks: Record<string, number[]> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson;
        const pts = details.points || 1;

        if (ev.teamId === homeTeamId) homeFramePoints += pts;
        else awayFramePoints += pts;

        if (ev.eventType === 'FRAME_WON') {
          if (ev.teamId === homeTeamId) homeFrames++;
          else awayFrames++;
        }

        if (ev.playerId && details.breakPoints) {
          if (!breaks[ev.playerId]) breaks[ev.playerId] = [];
          breaks[ev.playerId].push(details.breakPoints);
        }
      }

      if (homeFrames === 0 && awayFrames === 0) {
        if (homeFramePoints > awayFramePoints) homeFrames = 1;
        else if (awayFramePoints > homeFramePoints) awayFrames = 1;
      }

      let winner: string | null = null;
      if (homeFrames > awayFrames) winner = homeTeamId;
      else if (awayFrames > homeFrames) winner = awayTeamId;

      return {
        sportCode: 'SNOOKER',
        isComplete: true,
        homeScore: homeFrames,
        awayScore: awayFrames,
        winnerTeamId: winner,
        summary: `Frames: ${homeFrames} - ${awayFrames}`,
        details: { homeFramePoints, awayFramePoints, breaks },
      };
    }

    default: {
      return {
        sportCode,
        isComplete: true,
        homeScore: 0,
        awayScore: 0,
        summary: 'Match Completed',
        details: {},
      };
    }
  }
}
""")

write_file('src/services/stats-engine.ts', """import { prisma } from '../lib/prisma';
import { calculateScorebookState } from './scorebook-engine';
import { recalculateRankings } from './ranking-engine';

export function calculatePerformanceCategory(score: number, goals = 0, runs = 0, points = 0): string {
  if (score >= 800 || goals >= 15 || runs >= 500 || points >= 200) return 'ELITE';
  if (score >= 500 || goals >= 10 || runs >= 300 || points >= 120) return 'EXCELLENT';
  if (score >= 300 || goals >= 5 || runs >= 150 || points >= 60) return 'ADVANCED';
  if (score >= 150 || goals >= 2 || runs >= 50 || points >= 25) return 'INTERMEDIATE';
  return 'DEVELOPING';
}

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

  // 2. Update Match Record
  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: calculated.homeScore,
      awayScore: calculated.awayScore,
      winnerTeamId: calculated.winnerTeamId,
      status: 'OFFICIAL_VERIFIED',
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

  // 4. Process Player Match Statistics
  let mvpPlayerId: string | null = null;
  let highestImpact = -1;

  for (const p of participants) {
    let pGoals = 0;
    let pRuns = 0;
    let pWickets = 0;
    let pPoints = 0;
    let pAces = 0;

    for (const ev of events) {
      if (ev.playerId === p.playerId) {
        if (ev.eventType === 'GOAL') pGoals++;
        if (ev.eventType === 'POINT') pPoints++;
        if (ev.eventType === 'ACE') pAces++;
        const det = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson;
        if (det.runs) pRuns += det.runs;
      }
      const det = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson;
      if (det.bowlerId === p.playerId && (ev.eventType === 'WICKET' || det.isWicket)) {
        pWickets++;
      }
    }

    const impact = (pGoals * 50) + (pRuns * 2) + (pWickets * 30) + (pPoints * 10) + (pAces * 15);
    if (impact > highestImpact && impact > 0) {
      highestImpact = impact;
      mvpPlayerId = p.playerId;
    }

    const playerMatchStats = {
      goals: pGoals,
      runs: pRuns,
      wickets: pWickets,
      points: pPoints,
      aces: pAces,
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

  // 5. Update Cumulative Player Statistics for all participants
  for (const p of participants) {
    await recalculatePlayerCumulativeStats(p.playerId, sport.id);
  }

  // 6. Update Cumulative Team Statistics for both teams
  await recalculateTeamCumulativeStats(homeTeam.id, sport.id);
  await recalculateTeamCumulativeStats(awayTeam.id, sport.id);

  // 7. Update Rankings
  await recalculateRankings(sport.id, city.id, city.regionId);

  return { success: true, calculated, mvpPlayerId };
}

export async function recalculatePlayerCumulativeStats(playerId: string, sportId: string) {
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
  let mvpCount = 0;

  for (const ms of matchStats) {
    if (ms.isMvp) mvpCount++;
    const data = typeof ms.statsJson === 'string' ? JSON.parse(ms.statsJson || '{}') : ms.statsJson;
    goals += data.goals || 0;
    assists += data.assists || 0;
    runs += data.runs || 0;
    wickets += data.wickets || 0;
    points += data.points || 0;

    const winner = ms.match.winnerTeamId;
    if (winner === ms.teamId) wins++;
    else if (!winner) draws++;
    else losses++;
  }

  const ratingScore = Math.max(
    100,
    100 + (wins * 25) + (draws * 10) + (mvpCount * 40) + (goals * 20) + (runs * 1.5) + (wickets * 15) + (points * 5) - (losses * 10)
  );

  const performanceCategory = calculatePerformanceCategory(ratingScore, goals, runs, points);

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
""")

write_file('src/services/ranking-engine.ts', """import { prisma } from '../lib/prisma';

export async function recalculateRankings(sportId: string, cityId: string, regionId: string) {
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
    },
  });

  const sortedCityTeams = cityTeams.sort((a, b) => {
    const statsA = a.teamStats[0] || { points: 0, rankScore: 100 };
    const statsB = b.teamStats[0] || { points: 0, rankScore: 100 };
    if (statsB.points !== statsA.points) return statsB.points - statsA.points;
    return statsB.rankScore - statsA.rankScore;
  });

  for (let i = 0; i < sortedCityTeams.length; i++) {
    const team = sortedCityTeams[i];
    const stats = team.teamStats[0] || { points: 0, rankScore: 100 };
    await prisma.teamRanking.upsert({
      where: {
        teamId_sportId_cityId: {
          teamId: team.id,
          sportId,
          cityId,
        },
      },
      update: {
        regionId,
        rankPosition: i + 1,
        points: stats.points,
        goalDiffOrNrr: stats.rankScore,
      },
      create: {
        teamId: team.id,
        sportId,
        cityId,
        regionId,
        rankPosition: i + 1,
        points: stats.points,
        goalDiffOrNrr: stats.rankScore,
      },
    });
  }

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
    const statsA = a.statistics[0] || { ratingScore: 100 };
    const statsB = b.statistics[0] || { ratingScore: 100 };
    return statsB.ratingScore - statsA.ratingScore;
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
        regionId,
        rankPosition: i + 1,
        points: stats.ratingScore,
        performanceRating: stats.ratingScore,
      },
      create: {
        playerId: player.userId,
        sportId,
        cityId,
        regionId,
        rankPosition: i + 1,
        points: stats.ratingScore,
        performanceRating: stats.ratingScore,
      },
    });
  }
}
""")
