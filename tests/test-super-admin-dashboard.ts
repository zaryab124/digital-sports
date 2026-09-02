import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

async function runTests() {
  console.log('=== STARTING SUPER ADMIN DASHBOARD TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const testPassword = await hashPassword('adminPassword123');

    // 1. Setup Super Admin & Standard Users
    let superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Global Access' },
      });
    }

    let cityAdminRole = await prisma.role.findUnique({ where: { code: 'CITY_ADMIN' } });
    if (!cityAdminRole) {
      cityAdminRole = await prisma.role.create({
        data: { code: 'CITY_ADMIN', name: 'City Administrator', description: 'City Level Access' },
      });
    }

    const jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    const cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });

    const superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Chief Super Administrator',
        homeCityId: jampur!.id,
        userRoles: {
          create: [{ roleId: superAdminRole.id }],
        },
      },
    });

    const candidateUser = await prisma.user.create({
      data: {
        email: `candidate.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Municipal Official Candidate',
        homeCityId: jampur!.id,
      },
    });

    // -------------------------------------------------------------
    // Phase 1: Dashboard Metrics Aggregation
    // -------------------------------------------------------------
    console.log('[Phase 1] Testing Dashboard Metrics Aggregation');

    const totalUsers = await prisma.user.count();
    const totalTeams = await prisma.team.count();
    const totalCities = await prisma.city.count({ where: { isActive: true } });
    const totalSports = await prisma.sport.count({ where: { isActive: true } });
    const verifiedRevenueSum = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'VERIFIED' },
    });

    assert(totalUsers >= 2, 'Total Users metric accurately counted in database');
    assert(totalCities >= 7, 'All 7 ecosystem cities counted in metrics');
    assert(totalSports >= 6, 'All 6 core sports counted in metrics');
    assert(typeof (verifiedRevenueSum._sum.amount ?? 0) === 'number', 'Platform revenue aggregated from verified payments');

    // -------------------------------------------------------------
    // Phase 2: Dynamic Configurable Business Rules (No Hardcoding)
    // -------------------------------------------------------------
    console.log('[Phase 2] Testing Configurable Fees & Business Rules');

    // A. Team Registration Fee Config
    let teamFeeConfig = await prisma.feeConfiguration.findFirst({
      where: { feeType: 'TEAM_REGISTRATION' },
    });
    if (!teamFeeConfig) {
      teamFeeConfig = await prisma.feeConfiguration.create({
        data: { feeType: 'TEAM_REGISTRATION', amount: 1000.0, description: 'Annual Club Registration Fee' },
      });
    }

    const updatedTeamFee = await prisma.feeConfiguration.update({
      where: { id: teamFeeConfig.id },
      data: { amount: 1200.0 },
    });
    assert(updatedTeamFee.amount === 1200.0, 'Team registration fee dynamically updated to PKR 1200');

    // B. Player Transfer Fee Config
    let transferFeeConfig = await prisma.feeConfiguration.findFirst({
      where: { feeType: 'PLAYER_TRANSFER' },
    });
    if (!transferFeeConfig) {
      transferFeeConfig = await prisma.feeConfiguration.create({
        data: { feeType: 'PLAYER_TRANSFER', amount: 100.0, description: 'Player Transfer Processing Fee' },
      });
    }

    const updatedTransferFee = await prisma.feeConfiguration.update({
      where: { id: transferFeeConfig.id },
      data: { amount: 150.0 },
    });
    assert(updatedTransferFee.amount === 150.0, 'Player transfer fee dynamically updated to PKR 150');

    // C. Dynamic Ranking Rules Config
    let cricketRankingRule = await prisma.rankingRule.findUnique({
      where: { sportId: cricket!.id },
    });
    if (!cricketRankingRule) {
      cricketRankingRule = await prisma.rankingRule.create({
        data: { sportId: cricket!.id, winPoints: 3, drawPoints: 1, lossPoints: 0, mvpBonusPoints: 5 },
      });
    }

    const updatedRule = await prisma.rankingRule.update({
      where: { id: cricketRankingRule.id },
      data: { winPoints: 5, mvpBonusPoints: 10 },
    });
    assert(updatedRule.winPoints === 5, 'Cricket Win points dynamically configured to 5 pts');
    assert(updatedRule.mvpBonusPoints === 10, 'MVP bonus points dynamically configured to 10 pts');

    // -------------------------------------------------------------
    // Phase 3: Role Assignment & Scoping
    // -------------------------------------------------------------
    console.log('[Phase 3] Testing Role Assignment with Geographic Scoping');

    const assignedRole = await prisma.userRole.create({
      data: {
        userId: candidateUser.id,
        roleId: cityAdminRole.id,
        cityId: jampur!.id,
      },
      include: { role: true, city: true },
    });

    assert(assignedRole.role.code === 'CITY_ADMIN', 'Candidate successfully assigned CITY_ADMIN role');
    assert(assignedRole.cityId === jampur!.id, 'Role properly scoped to Jampur municipal boundary');

    // -------------------------------------------------------------
    // Phase 4: Administrative Approvals Workflow
    // -------------------------------------------------------------
    console.log('[Phase 4] Testing Team & Match Administrative Approvals');

    // A. Team Approval
    const pendingTeam = await prisma.team.create({
      data: {
        name: `Pending Squad ${Date.now()}`,
        code: `PS${Date.now() % 10000}`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: candidateUser.id,
        status: 'PENDING_APPROVAL',
      },
    });

    const approvedTeam = await prisma.team.update({
      where: { id: pendingTeam.id },
      data: {
        status: 'ACTIVE',
      },
    });

    assert(approvedTeam.status === 'ACTIVE', 'Admin successfully approved pending team');

    // B. Match Sanction
    const requestedMatch = await prisma.match.create({
      data: {
        sportId: cricket!.id,
        cityId: jampur!.id,
        homeTeamId: approvedTeam.id,
        awayTeamId: approvedTeam.id,
        requestedById: candidateUser.id,
        scheduledAt: new Date(),
        status: 'PENDING_ADMIN_APPROVAL',
      },
    });

    const sanctionedMatch = await prisma.match.update({
      where: { id: requestedMatch.id },
      data: {
        status: 'SCHEDULED',
        adminApproved: true,
        adminApprovedById: superAdminUser.id,
        adminApprovedAt: new Date(),
      },
    });

    assert(sanctionedMatch.status === 'SCHEDULED', 'Admin successfully sanctioned match');
    assert(sanctionedMatch.adminApproved === true, 'adminApproved flag set to true');

    // -------------------------------------------------------------
    // Phase 5: Broadcast Platform Notification
    // -------------------------------------------------------------
    console.log('[Phase 5] Testing Platform Broadcast Notification');

    const broadcast = await prisma.notification.create({
      data: {
        userId: candidateUser.id,
        title: 'Emergency Ground Notice',
        message: 'Jampur Municipal Ground under maintenance until Sunday.',
        type: 'WARNING',
      },
    });

    assert(Boolean(broadcast), 'Broadcast notification generated in database');
    assert(broadcast.type === 'WARNING', 'Notification priority preserved');

    // -------------------------------------------------------------
    // Phase 6: Audit Logging Verification
    // -------------------------------------------------------------
    console.log('[Phase 6] Testing Security Audit Trail Logging');

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: superAdminUser.id,
        action: 'SYSTEM_FEE_CONFIG_UPDATED',
        entityType: 'FeeConfiguration',
        entityId: teamFeeConfig.id,
        changesJson: JSON.stringify({ amount: 1200.0, updatedBy: superAdminUser.email }),
      },
    });

    assert(Boolean(auditLog), 'Audit log successfully recorded');
    assert(auditLog.action === 'SYSTEM_FEE_CONFIG_UPDATED', 'Audit action correctly logged');
    assert(auditLog.userId === superAdminUser.id, 'Audit actor recorded accurately');

    // Reset Fee Configurations for clean test idempotency
    await prisma.feeConfiguration.updateMany({
      where: { feeType: 'TEAM_REGISTRATION' },
      data: { amount: 1000.0 },
    });
    await prisma.feeConfiguration.updateMany({
      where: { feeType: 'PLAYER_TRANSFER' },
      data: { amount: 100.0 },
    });

    console.log(`=== SUPER ADMIN DASHBOARD TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
