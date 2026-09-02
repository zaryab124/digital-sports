const fs = require('fs');

const engineCode = `export interface ScorebookState {
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
  const code = (sportCode || '').toUpperCase();

  switch (code) {
    case 'FOOTBALL': {
      let homeGoals = 0;
      let awayGoals = 0;
      const playerGoals: Record<string, number> = {};
      const playerAssists: Record<string, number> = {};
      const playerCards: Record<string, { yellow: number; red: number }> = {};
      const playerFouls: Record<string, number> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson || {};

        if (ev.eventType === 'GOAL') {
          if (ev.teamId === homeTeamId) homeGoals++;
          else if (ev.teamId === awayTeamId) awayGoals++;

          if (ev.playerId) {
            playerGoals[ev.playerId] = (playerGoals[ev.playerId] || 0) + 1;
          }
          if (details.assistPlayerId) {
            playerAssists[details.assistPlayerId] = (playerAssists[details.assistPlayerId] || 0) + 1;
          }
        } else if (ev.eventType === 'CARD') {
          if (ev.playerId) {
            if (!playerCards[ev.playerId]) playerCards[ev.playerId] = { yellow: 0, red: 0 };
            if (details.cardType === 'RED') playerCards[ev.playerId].red++;
            else playerCards[ev.playerId].yellow++;
          }
        } else if (ev.eventType === 'FOUL') {
          if (ev.playerId) {
            playerFouls[ev.playerId] = (playerFouls[ev.playerId] || 0) + 1;
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
        summary: \`Full Time: \${homeGoals} - \${awayGoals}\`,
        details: { homeGoals, awayGoals, playerGoals, playerAssists, playerCards, playerFouls },
      };
    }

    case 'CRICKET': {
      let homeRuns = 0;
      let awayRuns = 0;
      let homeWickets = 0;
      let awayWickets = 0;
      let homeBalls = 0;
      let awayBalls = 0;
      let homeExtras = 0;
      let awayExtras = 0;

      const batsmanStats: Record<string, { runs: number; balls: number; fours: number; sixes: number }> = {};
      const bowlerStats: Record<string, { balls: number; runsGiven: number; wickets: number; maidens: number; wides: number; noBalls: number }> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson || {};
        const runs = Number(details.runs || 0);
        const extraRuns = Number(details.extraRuns || 0);
        const totalBallRuns = runs + extraRuns;
        const isWicket = ev.eventType === 'WICKET' || details.isWicket;
        const isLegalBall = details.isWide ? false : details.isNoBall ? false : true;
        const bowlerId = details.bowlerId;

        if (ev.teamId === homeTeamId) {
          homeRuns += totalBallRuns;
          if (isLegalBall) homeBalls++;
          if (extraRuns > 0) homeExtras += extraRuns;
          if (isWicket) homeWickets++;
        } else {
          awayRuns += totalBallRuns;
          if (isLegalBall) awayBalls++;
          if (extraRuns > 0) awayExtras += extraRuns;
          if (isWicket) awayWickets++;
        }

        if (ev.playerId && !details.isWide) {
          if (!batsmanStats[ev.playerId]) batsmanStats[ev.playerId] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
          batsmanStats[ev.playerId].runs += runs;
          if (isLegalBall) batsmanStats[ev.playerId].balls += 1;
          if (runs === 4) batsmanStats[ev.playerId].fours++;
          if (runs === 6) batsmanStats[ev.playerId].sixes++;
        }

        if (bowlerId) {
          if (!bowlerStats[bowlerId]) bowlerStats[bowlerId] = { balls: 0, runsGiven: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
          if (isLegalBall) bowlerStats[bowlerId].balls++;
          bowlerStats[bowlerId].runsGiven += totalBallRuns;
          if (isWicket && details.wicketType !== 'RUN_OUT') bowlerStats[bowlerId].wickets++;
          if (details.isWide) bowlerStats[bowlerId].wides++;
          if (details.isNoBall) bowlerStats[bowlerId].noBalls++;
        }
      }

      let winner: string | null = null;
      if (homeRuns > awayRuns) winner = homeTeamId;
      else if (awayRuns > homeRuns) winner = awayTeamId;

      const homeOvers = \`\${Math.floor(homeBalls / 6)}.\${homeBalls % 6}\`;
      const awayOvers = \`\${Math.floor(awayBalls / 6)}.\${awayBalls % 6}\`;

      return {
        sportCode: 'CRICKET',
        isComplete: true,
        homeScore: homeRuns,
        awayScore: awayRuns,
        winnerTeamId: winner,
        summary: \`Home: \${homeRuns}/\${homeWickets} (\${homeOvers} ov) | Away: \${awayRuns}/\${awayWickets} (\${awayOvers} ov)\`,
        details: {
          homeRuns,
          homeWickets,
          homeBalls,
          homeOvers,
          homeExtras,
          awayRuns,
          awayWickets,
          awayBalls,
          awayOvers,
          awayExtras,
          batsmanStats,
          bowlerStats,
        },
      };
    }

    case 'VOLLEYBALL': {
      let homeSets = 0;
      let awaySets = 0;
      let homePoints = 0;
      let awayPoints = 0;
      const setScores: Array<{ home: number; away: number }> = [{ home: 0, away: 0 }];
      const playerPoints: Record<string, { points: number; aces: number; blocks: number; spikes: number }> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson || {};
        const setIndex = Math.max(0, (ev.setOrInnings || 1) - 1);
        while (setScores.length <= setIndex) {
          setScores.push({ home: 0, away: 0 });
        }

        if (ev.eventType === 'POINT' || ev.eventType === 'ACE' || ev.eventType === 'BLOCK' || ev.eventType === 'SPIKE') {
          if (ev.teamId === homeTeamId) {
            homePoints++;
            setScores[setIndex].home++;
          } else {
            awayPoints++;
            setScores[setIndex].away++;
          }

          if (ev.playerId) {
            if (!playerPoints[ev.playerId]) playerPoints[ev.playerId] = { points: 0, aces: 0, blocks: 0, spikes: 0 };
            playerPoints[ev.playerId].points++;
            if (ev.eventType === 'ACE') playerPoints[ev.playerId].aces++;
            if (ev.eventType === 'BLOCK') playerPoints[ev.playerId].blocks++;
            if (ev.eventType === 'SPIKE') playerPoints[ev.playerId].spikes++;
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
        summary: \`Sets: \${homeSets} - \${awaySets} (\${homePoints} - \${awayPoints} total points)\`,
        details: { homeSets, awaySets, homePoints, awayPoints, setScores, playerPoints },
      };
    }

    case 'BADMINTON':
    case 'TABLE_TENNIS': {
      let homeGames = 0;
      let awayGames = 0;
      let homePoints = 0;
      let awayPoints = 0;
      const gameScores: Array<{ home: number; away: number }> = [{ home: 0, away: 0 }];
      const playerStats: Record<string, { points: number; smashes: number; errors: number }> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson || {};
        const gameIndex = Math.max(0, (ev.setOrInnings || 1) - 1);
        while (gameScores.length <= gameIndex) {
          gameScores.push({ home: 0, away: 0 });
        }

        if (ev.eventType === 'POINT' || ev.eventType === 'SMASH' || ev.eventType === 'SERVICE_ACE') {
          if (ev.teamId === homeTeamId) {
            homePoints++;
            gameScores[gameIndex].home++;
          } else {
            awayPoints++;
            gameScores[gameIndex].away++;
          }

          if (ev.playerId) {
            if (!playerStats[ev.playerId]) playerStats[ev.playerId] = { points: 0, smashes: 0, errors: 0 };
            playerStats[ev.playerId].points++;
            if (ev.eventType === 'SMASH') playerStats[ev.playerId].smashes++;
          }
        } else if (ev.eventType === 'UNFORCED_ERROR') {
          if (ev.playerId) {
            if (!playerStats[ev.playerId]) playerStats[ev.playerId] = { points: 0, smashes: 0, errors: 0 };
            playerStats[ev.playerId].errors++;
          }
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
        sportCode: code,
        isComplete: true,
        homeScore: homeGames,
        awayScore: awayGames,
        winnerTeamId: winner,
        summary: \`Games: \${homeGames} - \${awayGames} (\${homePoints} - \${awayPoints} pts)\`,
        details: { homeGames, awayGames, homePoints, awayPoints, gameScores, playerStats },
      };
    }

    case 'SNOOKER': {
      let homeFrames = 0;
      let awayFrames = 0;
      let homeFramePoints = 0;
      let awayFramePoints = 0;
      const breaks: Record<string, number[]> = {};
      const playerScores: Record<string, number> = {};

      for (const ev of events) {
        const details = typeof ev.detailsJson === 'string' ? JSON.parse(ev.detailsJson || '{}') : ev.detailsJson || {};
        const pts = Number(details.points || (ev.eventType === 'RED' ? 1 : 0));

        if (ev.teamId === homeTeamId) homeFramePoints += pts;
        else awayFramePoints += pts;

        if (ev.playerId) {
          playerScores[ev.playerId] = (playerScores[ev.playerId] || 0) + pts;
          if (details.breakPoints) {
            if (!breaks[ev.playerId]) breaks[ev.playerId] = [];
            breaks[ev.playerId].push(details.breakPoints);
          }
        }

        if (ev.eventType === 'FRAME_WON') {
          if (ev.teamId === homeTeamId) homeFrames++;
          else awayFrames++;
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
        summary: \`Frames: \${homeFrames} - \${awayFrames} (\${homeFramePoints} - \${awayFramePoints} pts)\`,
        details: { homeFrames, awayFrames, homeFramePoints, awayFramePoints, breaks, playerScores },
      };
    }

    default: {
      return {
        sportCode: code,
        isComplete: true,
        homeScore: 0,
        awayScore: 0,
        summary: 'Match Completed',
        details: {},
      };
    }
  }
}
`;

fs.writeFileSync('src/services/scorebook-engine.ts', engineCode.trim() + '\n', 'utf8');
console.log('[OK] Updated src/services/scorebook-engine.ts with all 6 high-fidelity sports engines');
