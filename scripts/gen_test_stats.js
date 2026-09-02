const fs = require('fs');

const testCode = `import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { calculatePerformanceCategory, processMatchFinalStatistics } from '../src/services/stats-engine';
import { recalculateRankings } from '../src/services/ranking-engine';

async function runTests() {
  console.log('=== STARTING STATISTICS & RANKING ENGINE TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(\`  ✓ \${message}\`);
      passed++;
    } else {
      console.error(\`  ✗ FAIL: \${message}\`);
      failed++;
    }
  }

  try {
    // 1. Setup Cities, Sports, and Test Users
    let jampur = await prisma.city.findFirst({ where: { slug: 'jampur' }, include: { region: true } });
    if (!jampur) jampur = await prisma.city.findFirst({ include: { region: true } });

    let dgKhan = await prisma.city.findFirst({ where: { slug: 'dera-ghazi-khan' } });

    let cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    let football = await prisma.sport.findFirst({ where: { slug: 'football' } });
    let volleyball = await prisma.sport.findFirst({ where: { slug: 'volleyball' } });
    let snooker = await prisma.sport.findFirst({ where: { slug: 'snooker' } });

    const testPassword = await hashPassword('password123');

    // -------------------------------------------------------------
    // Phase 1: Algorithmic Performance Category Testing
    // -------------------------------------------------------------
    console.log('[Phase 1] Testing Algorithmic Player Category Generator');

    const catDev = calculatePerformanceCategory('CRICKET', 120, 0, 10, 0, 0, 0);
    assert(catDev === 'DEVELOPING', 'Score < 180 correctly categorized as DEVELOPING');

    const catInter = calculatePerformanceCategory('FOOTBALL', 220, 2, 0, 0, 0, 0);
    assert(catInter === 'INTERMEDIATE', 'Rating 220 or 2 goals correctly categorized as INTERMEDIATE');

    const catAdv = calculatePerformanceCategory('CRICKET', 380, 0, 180, 5, 0, 0);
    assert(catAdv === 'ADVANCED', 'Rating 380 or 180 runs correctly categorized as ADVANCED');

    const catExc = calculatePerformanceCategory('FOOTBALL', 580, 12, 0, 0, 0, 0);
    assert(catExc === 'EXCELLENT', 'Rating 580 or 12 goals correctly categorized as EXCELLENT');

    const catElite = calculatePerformanceCategory('CRICKET', 820, 0, 550, 25, 0, 0);
    assert(catElite === 'ELITE', 'Rating 820 or 550 runs correctly categorized as ELITE');

    // -------------------------------------------------------------
    // Phase 2: Create Test Teams, Captains & Players
    // -------------------------------------------------------------
    console.log('[Phase 2] Setting up Multi-Squad Match Environment');

    const captainA = await prisma.user.create({
      data: {
        email: \`cap.a.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Captain Tariq (Jampur)',
        homeCityId: jampur!.id,
      },
    });

    const captainB = await prisma.user.create({
      data: {
        email: \`cap.b.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Captain Asif (Jampur)',
        homeCityId: jampur!.id,
      },
    });

    const starPlayer = await prisma.user.create({
      data: {
        email: \`star.p.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Babar Star Player',
        homeCityId: jampur!.id,
        playerProfile: {
          create: {
            primarySportId: cricket!.id,
            performanceCategory: 'DEVELOPING',
          },
        },
      },
    });

    const teamA = await prisma.team.create({
      data: {
        name: \`Jampur Eagles \${Date.now()}\`,
        code: \`JE\${Math.floor(Math.random() * 900 + 100)}\`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: captainA.id,
        status: 'ACTIVE',
        members: {
          create: [
            { playerId: captainA.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 1 },
            { playerId: starPlayer.id, role: 'PLAYER', status: 'ACTIVE', jerseyNumber: 56 },
          ],
        },
      },
    });

    const teamB = await prisma.team.create({
      data: {
        name: \`Jampur Falcons \${Date.now()}\`,
        code: \`JF\${Math.floor(Math.random() * 900 + 100)}\`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: captainB.id,
        status: 'ACTIVE',
        members: {
          create: [
            { playerId: captainB.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 10 },
          ],
        },
      },
    });

    // -------------------------------------------------------------
    // Phase 3: Verify Rankings are NEVER affected by Unlocked Matches
    // -------------------------------------------------------------
    console.log('[Phase 3] Testing Immutability of Standings on Unlocked Matches');

    const draftMatch = await prisma.match.create({
      data: {
        sportId: cricket!.id,
        cityId: jampur!.id,
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
        requestedById: captainA.id,
        status: 'LIVE',
        isLocked: false,
        scorebook: {
          create: {
            sportId: cricket!.id,
            currentStateJson: JSON.stringify({ score: '100 vs 50' }),
          },
        },
      },
    });

    // Verify star player stats before locking
    const statsBeforeLock = await prisma.playerStatistic.findUnique({
      where: { playerId_sportId: { playerId: starPlayer.id, sportId: cricket!.id } },
    });
    assert(!statsBeforeLock || statsBeforeLock.matchesPlayed === 0, 'Unlocked LIVE match does NOT increment player career matches');

    // -------------------------------------------------------------
    // Phase 4: Officially Lock Match & Verify Pipeline
    // -------------------------------------------------------------
    console.log('[Phase 4] Locking Match & Executing Full Statistics Pipeline');

    // Add score events to the scorebook
    const scorebook = await prisma.scorebook.findUnique({ where: { matchId: draftMatch.id } });
    await prisma.scoreEvent.create({
      data: {
        scorebookId: scorebook!.id,
        matchId: draftMatch.id,
        eventType: 'RUNS',
        teamId: teamA.id,
        playerId: starPlayer.id,
        detailsJson: JSON.stringify({ runs: 100, isBoundary: true }),
      },
    });

    await prisma.matchParticipant.createMany({
      data: [
        { matchId: draftMatch.id, teamId: teamA.id, playerId: starPlayer.id, isStarting: true },
        { matchId: draftMatch.id, teamId: teamA.id, playerId: captainA.id, isStarting: true },
        { matchId: draftMatch.id, teamId: teamB.id, playerId: captainB.id, isStarting: true },
      ],
    });

    // Process Official Lock
    const result = await processMatchFinalStatistics(draftMatch.id);
    assert(result.success === true, 'Match processed through official final statistics engine');
    assert(result.mvpPlayerId === starPlayer.id, 'Star player automatically identified as MVP');

    const finalizedMatch = await prisma.match.findUnique({ where: { id: draftMatch.id } });
    assert(finalizedMatch?.isLocked === true, 'Match is officially locked');
    assert(finalizedMatch?.status === 'OFFICIAL', 'Match status set to OFFICIAL');

    // -------------------------------------------------------------
    // Phase 5: Verify Updated Player Statistics & Category Promotion
    // -------------------------------------------------------------
    console.log('[Phase 5] Verifying Player Statistics & Category Promotion');

    const starStats = await prisma.playerStatistic.findUnique({
      where: { playerId_sportId: { playerId: starPlayer.id, sportId: cricket!.id } },
    });

    assert(Boolean(starStats), 'Player statistic row exists in database');
    assert(starStats!.matchesPlayed === 1, 'Player career matches incremented to 1');
    assert(starStats!.runs === 100, 'Player career runs recorded as 100');
    assert(starStats!.mvpCount === 1, 'Player MVP awards recorded as 1');
    assert(starStats!.ratingScore > 250, \`Player rating score promoted to \${starStats!.ratingScore}\`);
    assert(
      starStats!.performanceCategory === 'ADVANCED' || starStats!.performanceCategory === 'INTERMEDIATE',
      \`Player category promoted from DEVELOPING to \${starStats!.performanceCategory}\`
    );

    // -------------------------------------------------------------
    // Phase 6: Verify Team Statistics & Standings
    // -------------------------------------------------------------
    console.log('[Phase 6] Verifying Team Statistics & Standings');

    const teamAStats = await prisma.teamStatistic.findUnique({
      where: { teamId_sportId: { teamId: teamA.id, sportId: cricket!.id } },
    });
    assert(Boolean(teamAStats), 'Winning team statistic record created');
    assert(teamAStats!.matchesPlayed === 1, 'Winning team matches played recorded as 1');
    assert(teamAStats!.wins === 1, 'Winning team wins recorded as 1');
    assert(teamAStats!.points === 3, 'Winning team awarded 3 standard ranking points');

    // -------------------------------------------------------------
    // Phase 7: Verify Municipal & Regional Rankings
    // -------------------------------------------------------------
    console.log('[Phase 7] Verifying Municipal & Regional Rankings');

    const teamRank = await prisma.teamRanking.findFirst({
      where: { teamId: teamA.id, sportId: cricket!.id, cityId: jampur!.id },
    });
    assert(Boolean(teamRank), 'Team municipal ranking record exists');
    assert(teamRank!.rankPosition === 1, 'Winning squad assigned Municipal Rank #1');
    assert(teamRank!.points === 3, 'Ranking table points match 3 pts');

    const playerRank = await prisma.playerRanking.findFirst({
      where: { playerId: starPlayer.id, sportId: cricket!.id, cityId: jampur!.id },
    });
    assert(Boolean(playerRank), 'Player municipal leaderboard record exists');
    assert(playerRank!.rankPosition === 1, 'Star player assigned Municipal Leaderboard Rank #1');

    // -------------------------------------------------------------
    // Phase 8: Admin-Configurable Ranking Rules
    // -------------------------------------------------------------
    console.log('[Phase 8] Testing Admin-Configurable Ranking Rules');

    // Update rule: Win = 5 points, Draw = 2 points
    await prisma.rankingRule.upsert({
      where: { sportId: cricket!.id },
      update: { winPoints: 5, drawPoints: 2, lossPoints: 0, mvpBonusPoints: 10 },
      create: { sportId: cricket!.id, winPoints: 5, drawPoints: 2, lossPoints: 0, mvpBonusPoints: 10 },
    });

    // Recalculate rankings with new rule weights
    await recalculateRankings(cricket!.id, jampur!.id, jampur!.regionId);

    const updatedTeamRank = await prisma.teamRanking.findFirst({
      where: { teamId: teamA.id, sportId: cricket!.id, cityId: jampur!.id },
    });
    assert(updatedTeamRank!.points === 5, 'Custom admin ranking rule (5 pts for Win) successfully applied to standings');

    console.log(\`=== STATISTICS & RANKINGS TEST SUITE COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
`;

fs.writeFileSync('tests/test-statistics-rankings.ts', testCode.trim() + '\n', 'utf8');
console.log('[OK] Created tests/test-statistics-rankings.ts');
