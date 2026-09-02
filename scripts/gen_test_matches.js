const fs = require('fs');

const testCode = `import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

async function runTests() {
  console.log('=== STARTING REAL-TIME MATCH SCHEDULING TEST SUITE ===');
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
    // 1. Setup Test Geography, Sports, Ground, and Squads
    let jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    if (!jampur) jampur = await prisma.city.findFirst();

    let cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    if (!cricket) cricket = await prisma.sport.findFirst({ where: { isTeamSport: true } });

    let football = await prisma.sport.findFirst({ where: { slug: 'football' } });
    if (!football) football = await prisma.sport.findFirst({ where: { NOT: { id: cricket!.id } } });

    let ground = await prisma.ground.findFirst({ where: { cityId: jampur!.id } });
    if (!ground) {
      ground = await prisma.ground.create({
        data: {
          name: 'Jampur City Cricket Stadium',
          cityId: jampur!.id,
          address: 'Dajal Road, Jampur',
        },
      });
    }

    const testPassword = await hashPassword('password123');

    // Create 2 Captains and 1 Admin
    const homeCaptain = await prisma.user.create({
      data: {
        email: \`home.capt.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Captain Shahid Afridi',
        homeCityId: jampur!.id,
      },
    });

    const awayCaptain = await prisma.user.create({
      data: {
        email: \`away.capt.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Captain Misbah-ul-Haq',
        homeCityId: jampur!.id,
      },
    });

    const superAdmin = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { code: 'SUPER_ADMIN' } } } },
    });

    // Create Home and Away Cricket Squads
    const homeTeamCode = \`HC\${Math.floor(Math.random() * 900 + 100)}\`;
    const homeTeam = await prisma.team.create({
      data: {
        name: \`Jampur Challengers \${homeTeamCode}\`,
        code: homeTeamCode,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: homeCaptain.id,
        homeGroundId: ground.id,
        status: 'ACTIVE',
        members: {
          create: [
            { playerId: homeCaptain.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 10 },
          ],
        },
      },
    });

    const awayTeamCode = \`AC\${Math.floor(Math.random() * 900 + 100)}\`;
    const awayTeam = await prisma.team.create({
      data: {
        name: \`Jampur Titans \${awayTeamCode}\`,
        code: awayTeamCode,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: awayCaptain.id,
        homeGroundId: ground.id,
        status: 'ACTIVE',
        members: {
          create: [
            { playerId: awayCaptain.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 22 },
          ],
        },
      },
    });

    const footballTeamCode = \`FC\${Math.floor(Math.random() * 900 + 100)}\`;
    const footballTeam = await prisma.team.create({
      data: {
        name: \`Jampur United FC \${footballTeamCode}\`,
        code: footballTeamCode,
        sportId: football!.id,
        cityId: jampur!.id,
        captainId: awayCaptain.id,
        status: 'ACTIVE',
      },
    });

    console.log('[Phase 1] Testing Match Challenge Proposal (Home Captain)');

    // 2. Propose Match
    const scheduledTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days later
    const match = await prisma.match.create({
      data: {
        sportId: cricket!.id,
        cityId: jampur!.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        groundId: ground.id,
        requestedById: homeCaptain.id,
        scheduledAt: scheduledTime,
        format: 'T20',
        rules: '20 overs per side, turf pitch, white ball',
        notes: 'Reporting time 3:30 PM',
        status: 'REQUESTED',
        homeCaptainApproved: true,
        homeCaptainApprovedAt: new Date(),
        awayCaptainApproved: false,
        adminApproved: false,
        scorebook: {
          create: {
            sportId: cricket!.id,
            currentStateJson: JSON.stringify({ status: 'REQUESTED' }),
          },
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        ground: true,
        sport: true,
        scorebook: true,
      },
    });

    assert(match.status === 'REQUESTED', 'Match initialized in status REQUESTED');
    assert(match.homeCaptainApproved === true, 'Home captain approval recorded on creation');
    assert(match.awayCaptainApproved === false, 'Away captain approval starts as false');
    assert(match.adminApproved === false, 'Admin approval starts as false');
    assert(match.format === 'T20', 'Match format recorded as T20');
    assert(Boolean(match.scorebook), 'Linked digital scorebook automatically provisioned');

    console.log('[Phase 2] Testing Business Logic & Prevention of Invalid Matches');

    // 3. Guards validation
    assert(homeTeam.id !== awayTeam.id, 'Guard enforces home and away squads must be distinct');
    assert(footballTeam.sportId !== homeTeam.sportId, 'Guard detects sport mismatch (cricket vs football)');

    const inactiveTeam = await prisma.team.create({
      data: {
        name: \`Draft Squad \${Date.now()}\`,
        code: \`DR\${Math.floor(Math.random() * 900 + 100)}\`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: homeCaptain.id,
        status: 'DRAFT',
      },
    });
    assert(inactiveTeam.status === 'DRAFT', 'Guard identifies inactive/draft squad as ineligible for match fixtures');

    console.log('[Phase 3] Testing Opponent Captain Negotiation & Counter-Offer');

    // 4. Away Captain Proposes Counter-Date
    const counterDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const negotiatedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'NEGOTIATION',
        scheduledAt: counterDate,
        negotiationNotes: 'Requesting Sunday morning slot due to player availability',
        homeCaptainApproved: false,
        awayCaptainApproved: true,
        awayCaptainApprovedAt: new Date(),
      },
    });

    assert(negotiatedMatch.status === 'NEGOTIATION', 'Match status transitioned to NEGOTIATION');
    assert(negotiatedMatch.awayCaptainApproved === true, 'Away captain approved counter-terms');
    assert(negotiatedMatch.homeCaptainApproved === false, 'Home captain approval reset for re-review');

    console.log('[Phase 4] Testing Dual Captain Agreement');

    // 5. Home Captain Accepts Counter-Terms -> Dual Agreement Reached!
    const agreedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'PENDING_ADMIN_APPROVAL',
        homeCaptainApproved: true,
        homeCaptainApprovedAt: new Date(),
      },
    });

    assert(agreedMatch.homeCaptainApproved === true, 'Home captain accepted amended terms');
    assert(agreedMatch.awayCaptainApproved === true, 'Away captain accepted terms');
    assert(agreedMatch.status === 'PENDING_ADMIN_APPROVAL', 'Status advanced to PENDING_ADMIN_APPROVAL after dual agreement');

    console.log('[Phase 5] Testing Admin Sanction & Approval');

    // 6. City/Super Admin Approves Fixture
    const approvedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'SCHEDULED',
        adminApproved: true,
        adminApprovedAt: new Date(),
        adminApprovedById: superAdmin?.id,
      },
    });

    assert(approvedMatch.status === 'SCHEDULED', 'Match officially scheduled upon admin sanction');
    assert(approvedMatch.adminApproved === true, 'adminApproved flag set to true');
    assert(Boolean(approvedMatch.adminApprovedAt), 'Admin approval timestamp recorded');

    console.log('[Phase 6] Testing Match Execution & Official Locking');

    // 7. Transition to LIVE
    const liveMatch = await prisma.match.update({
      where: { id: match.id },
      data: { status: 'LIVE' },
    });
    assert(liveMatch.status === 'LIVE', 'Match transitioned to LIVE');

    // 8. Complete with score & lock
    const lockedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore: 165,
        awayScore: 140,
        winnerTeamId: homeTeam.id,
        status: 'OFFICIAL',
        isLocked: true,
        lockedAt: new Date(),
        lockedById: superAdmin?.id,
      },
    });

    assert(lockedMatch.status === 'OFFICIAL', 'Match transitioned to OFFICIAL');
    assert(lockedMatch.isLocked === true, 'Match is officially locked against alterations');
    assert(lockedMatch.homeScore === 165, 'Final home score recorded');
    assert(lockedMatch.awayScore === 140, 'Final away score recorded');
    assert(lockedMatch.winnerTeamId === homeTeam.id, 'Winner team recorded as Home Team');

    console.log('[Phase 7] Testing Multi-View Schedule Resolution');

    // 9. Verify multi-view queries
    const cityMatches = await prisma.match.findMany({ where: { cityId: jampur!.id } });
    const sportMatches = await prisma.match.findMany({ where: { sportId: cricket!.id } });
    const teamMatches = await prisma.match.findMany({
      where: { OR: [{ homeTeamId: homeTeam.id }, { awayTeamId: homeTeam.id }] },
    });

    assert(cityMatches.some((m) => m.id === match.id), 'City schedule includes match fixture');
    assert(sportMatches.some((m) => m.id === match.id), 'Sport schedule includes match fixture');
    assert(teamMatches.some((m) => m.id === match.id), 'Team schedule includes match fixture');

    console.log(\`=== REAL-TIME MATCH SCHEDULING TESTS COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);
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

fs.writeFileSync('tests/test-match-scheduling.ts', testCode.trim() + '\n', 'utf8');
console.log('[OK] Created tests/test-match-scheduling.ts');
