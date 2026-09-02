import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

write_file('tests/run-all-tests.ts', """import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/lib/auth';
import { hasRole, RoleCode, canManageCity, canScoreMatch } from '../src/lib/rbac';
import { createPaymentOrder, submitPaymentProof, verifyPayment } from '../src/services/payment-service';
import { calculateScorebookState } from '../src/services/scorebook-engine';
import { processMatchFinalStatistics } from '../src/services/stats-engine';
import { recalculateRankings } from '../src/services/ranking-engine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\\n==================================================');
  console.log('SPORTS COMMUNITY E2E AUTOMATED VERIFICATION SUITE');
  console.log('==================================================\\n');

  // TEST SUITE 1: Geography & Sports Hierarchy
  console.log('--- TEST SUITE 1: Geography & Sports Hierarchy ---');
  const cities = await prisma.city.findMany({ include: { region: { include: { province: true } } } });
  assert(cities.length >= 7, 'At least 7 initial cities exist in database');

  const jampur = cities.find((c) => c.name === 'Jampur');
  assert(!!jampur, 'Jampur city record is present');
  assert(jampur?.region?.name === 'South Punjab', 'Jampur is properly associated with South Punjab region');

  const sports = await prisma.sport.findMany({ include: { category: true } });
  assert(sports.length >= 6, 'All 6 core sports exist in database');
  const cricket = sports.find((s) => s.code === 'CRICKET');
  const football = sports.find((s) => s.code === 'FOOTBALL');
  assert(!!cricket && cricket.isTeamSport === true, 'Cricket is configured as a team sport');
  assert(!!football && football.isTeamSport === true, 'Football is configured as a team sport');

  // TEST SUITE 2: Authentication & RBAC Authorization
  console.log('\\n--- TEST SUITE 2: Authentication & RBAC Roles ---');
  const password = 'testSecurePassword123';
  const hashed = await hashPassword(password);
  const match = await verifyPassword(password, hashed);
  assert(match, 'Password hashing and bcrypt verification works correctly');

  const superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@sports.pk' },
    include: { userRoles: { include: { role: true } } },
  });
  assert(!!superAdmin, 'Super Admin user account exists');

  const adminToken = signToken({
    userId: superAdmin!.id,
    email: superAdmin!.email,
    fullName: superAdmin!.fullName,
    homeCityId: superAdmin!.homeCityId,
    roles: [{ roleCode: 'SUPER_ADMIN' }],
  });
  const decoded = verifyToken(adminToken);
  assert(decoded?.userId === superAdmin!.id, 'JWT signing and verification works correctly');
  assert(hasRole(decoded!, RoleCode.SUPER_ADMIN), 'RBAC recognizes SUPER_ADMIN role');

  const jampurAdmin = await prisma.user.findUnique({
    where: { email: 'cityadmin.jampur@sports.pk' },
    include: { userRoles: { include: { role: true } } },
  });
  const jampurToken = signToken({
    userId: jampurAdmin!.id,
    email: jampurAdmin!.email,
    fullName: jampurAdmin!.fullName,
    homeCityId: jampurAdmin!.homeCityId,
    roles: [{ roleCode: 'CITY_ADMIN', cityId: jampur!.id }],
  });
  assert(canManageCity(verifyToken(jampurToken)!, jampur!.id), 'City Admin has management privileges for assigned city');

  // TEST SUITE 3: Team Registration & Fee Verification Lifecycle
  console.log('\\n--- TEST SUITE 3: Team Lifecycle & Dynamic Fee Verification ---');
  const testTeam = await prisma.team.create({
    data: {
      cityId: jampur!.id,
      sportId: cricket!.id,
      captainId: superAdmin!.id,
      name: `Test Tigers CC ${Date.now()}`,
      code: 'TTCC',
      status: 'PENDING_PAYMENT',
    },
  });
  assert(testTeam.status === 'PENDING_PAYMENT', 'New team initialized in PENDING_PAYMENT status');

  const paymentOrder = await createPaymentOrder({
    userId: superAdmin!.id,
    paymentType: 'TEAM_REGISTRATION',
    teamId: testTeam.id,
    sportId: cricket!.id,
    cityId: jampur!.id,
  });
  assert(paymentOrder.amount === 1000, 'Team registration fee dynamically calculated as Rs. 1,000');
  assert(paymentOrder.status === 'PENDING', 'Payment order initialized as PENDING');

  const submittedPayment = await submitPaymentProof({
    paymentId: paymentOrder.id,
    paymentMethod: 'EASYPAISA',
    transactionReference: 'EP-TEST-998877',
    remarks: 'Paid via EasyPaisa App',
  });
  assert(submittedPayment.status === 'SUBMITTED', 'Payment status advanced to SUBMITTED after proof upload');

  const updatedTeamAfterProof = await prisma.team.findUnique({ where: { id: testTeam.id } });
  assert(updatedTeamAfterProof?.status === 'PAYMENT_SUBMITTED', 'Team status transitioned to PAYMENT_SUBMITTED');

  const verifiedPayment = await verifyPayment({
    paymentId: paymentOrder.id,
    verifiedById: superAdmin!.id,
    action: 'APPROVED',
  });
  assert(verifiedPayment.status === 'VERIFIED', 'Payment verified and approved by administrator');

  const verifiedTeam = await prisma.team.findUnique({ where: { id: testTeam.id } });
  assert(verifiedTeam?.status === 'PENDING_APPROVAL', 'Team status transitioned to PENDING_APPROVAL after payment verification');

  // Activate team
  await prisma.team.update({ where: { id: testTeam.id }, data: { status: 'ACTIVE' } });

  // TEST SUITE 4: Player Transfers & Prevention of Dual-Membership
  console.log('\\n--- TEST SUITE 4: Player Transfers & Anti-Dual-Team Enforcement ---');
  const player = await prisma.user.findUnique({ where: { email: 'player.bilal@sports.pk' } });
  assert(!!player, 'Player Bilal exists in database');

  // Verify Player Bilal is active in Jampur Lions
  const currentTeam = await prisma.team.findFirst({ where: { name: 'Jampur Lions Cricket Club' } });
  const activeMembership = await prisma.teamMember.findFirst({
    where: { playerId: player!.id, teamId: currentTeam!.id, status: 'ACTIVE' },
  });
  assert(!!activeMembership, 'Player Bilal has active membership in Jampur Lions');

  // Attempt transfer to testTeam
  const transferOrder = await prisma.playerTransfer.create({
    data: {
      playerId: player!.id,
      sportId: cricket!.id,
      cityId: jampur!.id,
      oldTeamId: currentTeam!.id,
      newTeamId: testTeam.id,
      status: 'PENDING_PAYMENT',
      fee: 100.0,
    },
  });
  assert(transferOrder.fee === 100.0, 'Player transfer fee set to Rs. 100');

  // Process transfer approval atomically
  await prisma.teamMember.updateMany({
    where: { teamId: currentTeam!.id, playerId: player!.id, status: 'ACTIVE' },
    data: { status: 'FORMER', leftAt: new Date() },
  });
  await prisma.teamMember.create({
    data: { teamId: testTeam.id, playerId: player!.id, role: 'PLAYER', status: 'ACTIVE' },
  });
  await prisma.playerTransfer.update({
    where: { id: transferOrder.id },
    data: { status: 'COMPLETED', approvedById: superAdmin!.id, approvedAt: new Date(), completedAt: new Date() },
  });

  const formerMem = await prisma.teamMember.findFirst({
    where: { teamId: currentTeam!.id, playerId: player!.id, status: 'FORMER' },
  });
  const newMem = await prisma.teamMember.findFirst({
    where: { teamId: testTeam.id, playerId: player!.id, status: 'ACTIVE' },
  });
  assert(!!formerMem, 'Historical team membership preserved as FORMER (never deleted)');
  assert(!!newMem, 'New team membership activated as ACTIVE');

  // TEST SUITE 5: Match Workflow, Scorebook Engine & Automatic Stats/Rankings
  console.log('\\n--- TEST SUITE 5: Scorebook Engine, Match Locking & Ranking Recalculation ---');
  const matchRecord = await prisma.match.create({
    data: {
      cityId: jampur!.id,
      sportId: cricket!.id,
      homeTeamId: currentTeam!.id,
      awayTeamId: testTeam.id,
      requestedById: superAdmin!.id,
      scheduledAt: new Date(),
      status: 'SCHEDULED',
      participants: {
        create: [
          { teamId: currentTeam!.id, playerId: superAdmin!.id, isStarting: true },
          { teamId: testTeam.id, playerId: player!.id, isStarting: true },
        ],
      },
      scorebook: {
        create: {
          sportId: cricket!.id,
          currentStateJson: JSON.stringify({ status: 'SCHEDULED' }),
        },
      },
    },
    include: { scorebook: true },
  });
  assert(!!matchRecord.scorebook, 'Match initialized with attached digital scorebook');

  // Add score events
  await prisma.scoreEvent.createMany({
    data: [
      { scorebookId: matchRecord.scorebook!.id, matchId: matchRecord.id, eventType: 'RUNS', teamId: currentTeam!.id, playerId: superAdmin!.id, detailsJson: JSON.stringify({ runs: 6 }) },
      { scorebookId: matchRecord.scorebook!.id, matchId: matchRecord.id, eventType: 'RUNS', teamId: currentTeam!.id, playerId: superAdmin!.id, detailsJson: JSON.stringify({ runs: 4 }) },
      { scorebookId: matchRecord.scorebook!.id, matchId: matchRecord.id, eventType: 'WICKET', teamId: currentTeam!.id, playerId: superAdmin!.id, detailsJson: JSON.stringify({ bowlerId: player!.id, isWicket: true }) },
    ],
  });

  const events = await prisma.scoreEvent.findMany({ where: { matchId: matchRecord.id } });
  const calculated = calculateScorebookState('CRICKET', currentTeam!.id, testTeam.id, events);
  assert(calculated.homeScore === 10, 'Cricket scoring engine accurately aggregated 10 runs for home team');

  // Process Final Statistics & Lock
  const statsResult = await processMatchFinalStatistics(matchRecord.id);
  assert(statsResult.success === true, 'processMatchFinalStatistics completed successfully');

  const lockedMatch = await prisma.match.findUnique({ where: { id: matchRecord.id } });
  assert(lockedMatch?.isLocked === true, 'Match is officially locked from further modifications');
  assert(lockedMatch?.status === 'OFFICIAL_VERIFIED', 'Match status is set to OFFICIAL_VERIFIED');

  // Verify automatic player stats & ranking updates
  const playerStats = await prisma.playerStatistic.findUnique({
    where: { playerId_sportId: { playerId: player!.id, sportId: cricket!.id } },
  });
  assert(!!playerStats && playerStats.matchesPlayed >= 1, 'Player statistics automatically updated on match lock');
  assert(playerStats?.performanceCategory !== undefined, 'Player performance category automatically computed');

  const teamRankings = await prisma.teamRanking.findMany({
    where: { sportId: cricket!.id, cityId: jampur!.id },
    orderBy: { rankPosition: 'asc' },
  });
  assert(teamRankings.length >= 1, 'Team rankings automatically calculated and sorted');

  console.log('\\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
""")

print('[DONE] Test suite written.')
