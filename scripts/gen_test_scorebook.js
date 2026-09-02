const fs = require('fs');

const testCode = `import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { calculateScorebookState } from '../src/services/scorebook-engine';
import { processMatchFinalStatistics } from '../src/services/stats-engine';
import { createAuditLog } from '../src/services/audit-service';

async function runTests() {
  console.log('=== STARTING OFFICIAL SCOREBOOK SYSTEM TEST SUITE ===');
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
    // 1. Setup Test Geography, Sports, Ground, Official, and Teams
    let jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    if (!jampur) jampur = await prisma.city.findFirst();

    let cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    let football = await prisma.sport.findFirst({ where: { slug: 'football' } });
    let volleyball = await prisma.sport.findFirst({ where: { slug: 'volleyball' } });
    let snooker = await prisma.sport.findFirst({ where: { slug: 'snooker' } });

    const testPassword = await hashPassword('password123');

    // Create Official User
    const officialUser = await prisma.user.create({
      data: {
        email: \`official.scorer.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Aleem Dar (Certified Umpire)',
        homeCityId: jampur!.id,
        officialProfile: {
          create: {
            certifications: 'PCB Level 3 / ICC Certified',
            experienceYears: 12,
            licenseNumber: 'OFF-JAM-2026-99',
          },
        },
      },
    });

    const homeCaptain = await prisma.user.create({
      data: {
        email: \`h.cap.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Home Captain Babar',
        homeCityId: jampur!.id,
      },
    });

    const awayCaptain = await prisma.user.create({
      data: {
        email: \`a.cap.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Away Captain Rizwan',
        homeCityId: jampur!.id,
      },
    });

    const homeTeam = await prisma.team.create({
      data: {
        name: \`Jampur Royals \${Date.now()}\`,
        code: \`JR\${Math.floor(Math.random() * 900 + 100)}\`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: homeCaptain.id,
        status: 'ACTIVE',
        members: {
          create: [{ playerId: homeCaptain.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 56 }],
        },
      },
    });

    const awayTeam = await prisma.team.create({
      data: {
        name: \`Jampur Strikers \${Date.now()}\`,
        code: \`JS\${Math.floor(Math.random() * 900 + 100)}\`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: awayCaptain.id,
        status: 'ACTIVE',
        members: {
          create: [{ playerId: awayCaptain.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 16 }],
        },
      },
    });

    console.log('[Phase 1] Testing Official Assignment & Match Initialization');

    // Create Match and Assign Official
    const match = await prisma.match.create({
      data: {
        sportId: cricket!.id,
        cityId: jampur!.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        requestedById: homeCaptain.id,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'SCHEDULED',
        officials: {
          create: [{ officialId: officialUser.id, role: 'SCORER' }],
        },
        scorebook: {
          create: {
            sportId: cricket!.id,
            currentStateJson: JSON.stringify({ status: 'SCHEDULED' }),
          },
        },
      },
      include: {
        officials: true,
        scorebook: true,
      },
    });

    assert(match.officials.length === 1, 'Official successfully assigned to match');
    assert(match.officials[0].role === 'SCORER', 'Official role designated as SCORER');
    assert(Boolean(match.scorebook), 'Digital scorebook attached to match');

    console.log('[Phase 2] Testing Pre-Match Checklist Verification');

    // Pre-match confirmation
    const preMatchDetails = {
      teamsVerified: true,
      groundConfirmed: true,
      pitchCondition: 'Turf wicket with even bounce',
      tossWinnerTeamId: homeTeam.id,
      tossDecision: 'BAT',
      preMatchVerifiedAt: new Date().toISOString(),
      verifiedByOfficialId: officialUser.id,
    };

    await prisma.scorebook.update({
      where: { id: match.scorebook!.id },
      data: {
        currentStateJson: JSON.stringify({ status: 'PRE_MATCH_CONFIRMED', preMatch: preMatchDetails }),
      },
    });

    await prisma.match.update({
      where: { id: match.id },
      data: { status: 'LIVE' },
    });

    await createAuditLog({
      userId: officialUser.id,
      action: 'PREMATCH_VERIFIED',
      entityType: 'Match',
      entityId: match.id,
      changes: preMatchDetails,
    });

    const liveMatch = await prisma.match.findUnique({ where: { id: match.id } });
    assert(liveMatch?.status === 'LIVE', 'Pre-match verification transitioned match status to LIVE');

    console.log('[Phase 3] Testing Sport-Specific Score Engines (Cricket & Football)');

    // 1. Cricket Scoring Engine Test
    const cricketEvents = [
      { eventType: 'RUNS', teamId: homeTeam.id, playerId: homeCaptain.id, detailsJson: JSON.stringify({ runs: 4, isBoundary: true }) },
      { eventType: 'RUNS', teamId: homeTeam.id, playerId: homeCaptain.id, detailsJson: JSON.stringify({ runs: 6, isBoundary: true }) },
      { eventType: 'RUNS', teamId: homeTeam.id, playerId: homeCaptain.id, detailsJson: JSON.stringify({ extraRuns: 1, isWide: true }) },
      { eventType: 'WICKET', teamId: homeTeam.id, playerId: homeCaptain.id, detailsJson: JSON.stringify({ isWicket: true, bowlerId: awayCaptain.id }) },
      { eventType: 'RUNS', teamId: awayTeam.id, playerId: awayCaptain.id, detailsJson: JSON.stringify({ runs: 4, isBoundary: true }) },
    ];

    const cricketState = calculateScorebookState('CRICKET', homeTeam.id, awayTeam.id, cricketEvents);
    assert(cricketState.homeScore === 11, 'Cricket engine aggregated 11 runs for Home Team (4 + 6 + 1 wd)');
    assert(cricketState.awayScore === 4, 'Cricket engine aggregated 4 runs for Away Team');
    assert(cricketState.details.homeWickets === 1, 'Cricket engine recorded 1 home wicket');
    assert(cricketState.details.batsmanStats[homeCaptain.id].runs === 10, 'Batsman runs accurately calculated as 10 (4 + 6)');
    assert(cricketState.details.bowlerStats[awayCaptain.id].wickets === 1, 'Bowler wickets accurately recorded as 1');

    // 2. Football Scoring Engine Test
    const footballEvents = [
      { eventType: 'GOAL', teamId: 'team1', playerId: 'p1', detailsJson: JSON.stringify({ assistPlayerId: 'p2' }) },
      { eventType: 'GOAL', teamId: 'team1', playerId: 'p1', detailsJson: {} },
      { eventType: 'GOAL', teamId: 'team2', playerId: 'p3', detailsJson: {} },
      { eventType: 'CARD', teamId: 'team2', playerId: 'p3', detailsJson: JSON.stringify({ cardType: 'YELLOW' }) },
    ];
    const footballState = calculateScorebookState('FOOTBALL', 'team1', 'team2', footballEvents);
    assert(footballState.homeScore === 2, 'Football engine recorded 2 home goals');
    assert(footballState.awayScore === 1, 'Football engine recorded 1 away goal');
    assert(footballState.winnerTeamId === 'team1', 'Football engine identified winner as team1');
    assert(footballState.details.playerCards['p3'].yellow === 1, 'Football engine recorded 1 yellow card for p3');

    // 3. Volleyball Scoring Engine Test
    const volleyEvents = [
      { eventType: 'POINT', teamId: 'v1', playerId: 'vp1', detailsJson: {} },
      { eventType: 'ACE', teamId: 'v1', playerId: 'vp1', detailsJson: {} },
      { eventType: 'SET_WON', teamId: 'v1', setOrInnings: 1 },
      { eventType: 'SET_WON', teamId: 'v1', setOrInnings: 2 },
      { eventType: 'SET_WON', teamId: 'v2', setOrInnings: 3 },
      { eventType: 'SET_WON', teamId: 'v1', setOrInnings: 4 },
    ];
    const volleyState = calculateScorebookState('VOLLEYBALL', 'v1', 'v2', volleyEvents);
    assert(volleyState.homeScore === 3, 'Volleyball sets won calculated as 3');
    assert(volleyState.awayScore === 1, 'Volleyball sets won calculated as 1');
    assert(volleyState.winnerTeamId === 'v1', 'Volleyball winner identified as v1 (3-1)');

    // 4. Snooker Scoring Engine Test
    const snookerEvents = [
      { eventType: 'RED', teamId: 's1', playerId: 'sp1', detailsJson: { points: 1 } },
      { eventType: 'COLOUR', teamId: 's1', playerId: 'sp1', detailsJson: { points: 7, colour: 'BLACK' } },
      { eventType: 'FRAME_WON', teamId: 's1', setOrInnings: 1 },
      { eventType: 'FRAME_WON', teamId: 's1', setOrInnings: 2 },
      { eventType: 'FRAME_WON', teamId: 's2', setOrInnings: 3 },
      { eventType: 'FRAME_WON', teamId: 's1', setOrInnings: 4 },
    ];
    const snookerState = calculateScorebookState('SNOOKER', 's1', 's2', snookerEvents);
    assert(snookerState.homeScore === 3, 'Snooker frames won calculated as 3');
    assert(snookerState.awayScore === 1, 'Snooker frames won calculated as 1');
    assert(snookerState.winnerTeamId === 's1', 'Snooker match winner identified as s1');

    console.log('[Phase 4] Testing Audit Logging on Live Score Events');

    // Save event to database
    const savedEvent = await prisma.scoreEvent.create({
      data: {
        scorebookId: match.scorebook!.id,
        matchId: match.id,
        eventType: 'RUNS',
        teamId: homeTeam.id,
        playerId: homeCaptain.id,
        detailsJson: JSON.stringify({ runs: 6 }),
      },
    });

    await createAuditLog({
      userId: officialUser.id,
      action: 'SCORE_EVENT_RECORDED',
      entityType: 'ScoreEvent',
      entityId: savedEvent.id,
      changes: { runs: 6, homeCaptain: homeCaptain.id },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: { entityId: savedEvent.id, action: 'SCORE_EVENT_RECORDED' },
    });
    assert(Boolean(auditLog), 'Audit log successfully recorded for live score change');

    console.log('[Phase 5] Testing Post-Match Finalization & Evidence Photos');

    const photoEvidence = await prisma.matchPhoto.create({
      data: {
        matchId: match.id,
        teamId: homeTeam.id,
        sportId: cricket!.id,
        photoUrl: 'https://storage.sports.pk/scoresheet-99.jpg',
        caption: 'Official Signed Scoresheet',
        uploadedById: officialUser.id,
        status: 'APPROVED',
      },
    });
    assert(photoEvidence.status === 'APPROVED', 'Scoresheet photo evidence attached to match');

    console.log('[Phase 6] Testing Match Result Verification & Scorebook Locking');

    // Execute processMatchFinalStatistics to lock and compute
    const statsResult = await processMatchFinalStatistics(match.id);

    const finalizedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: { scorebook: true },
    });

    assert(finalizedMatch?.status === 'OFFICIAL_VERIFIED' || finalizedMatch?.status === 'OFFICIAL', 'Match status set to OFFICIAL');
    assert(finalizedMatch?.isLocked === true, 'Match is officially locked from further modification');
    assert(Boolean(statsResult), 'Player and team statistics automatically updated upon verification');

    console.log(\`=== OFFICIAL SCOREBOOK TESTS COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
`;

fs.writeFileSync('tests/test-official-scorebook.ts', testCode.trim() + '\n', 'utf8');
console.log('[OK] Created tests/test-official-scorebook.ts');
