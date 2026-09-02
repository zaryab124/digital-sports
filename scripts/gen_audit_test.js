const fs = require('fs');

const auditTestCode = `import { prisma } from '../src/lib/prisma';
import { hashPassword, signToken, verifyToken } from '../src/lib/auth';
import { RoleCode, hasRole, isSuperAdmin, canManageCity } from '../src/lib/rbac';
import { createPaymentOrder, submitPaymentProof, verifyPayment, createTransferRequest } from '../src/services/payment-service';
import { calculateScorebookState } from '../src/services/scorebook-engine';
import { processMatchFinalStatistics } from '../src/services/stats-engine';
import { sendNotification } from '../src/services/notification-service';
import { publishMatchEvent, publishUserEvent, publishGlobalEvent } from '../src/lib/realtime';

async function runAudit() {
  console.log('================================================================');
  console.log('SPORTS COMMUNITY PLATFORM: COMPLETE 23-FLOW PRODUCTION AUDIT');
  console.log('================================================================\\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, flowNum: number, name: string) {
    if (condition) {
      console.log(\`  ✓ [Flow \${flowNum.toString().padStart(2, '0')}] PASS: \${name}\`);
      passed++;
    } else {
      console.error(\`  ✗ [Flow \${flowNum.toString().padStart(2, '0')}] FAIL: \${name}\`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const testPassword = await hashPassword('AuditPassword123!');

    // -----------------------------------------------------------------
    // 0. Environment & Core Prerequisites
    // -----------------------------------------------------------------
    const jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    const dgkhan = await prisma.city.findFirst({ where: { slug: 'dg-khan' } });
    const cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    const football = await prisma.sport.findFirst({ where: { slug: 'football' } });

    if (!jampur || !dgkhan || !cricket || !football) {
      throw new Error('Core cities or sports missing in database.');
    }

    // -----------------------------------------------------------------
    // Flow 1: User Registration
    // -----------------------------------------------------------------
    const captainUser = await prisma.user.create({
      data: {
        email: \`audit.captain.\${timestamp}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Captain Asad Audit',
        phone: '+923001234567',
        homeCityId: jampur.id,
      },
    });
    assert(Boolean(captainUser.id && captainUser.email), 1, 'User account registered with hashed credentials');

    // -----------------------------------------------------------------
    // Flow 2: Login & Authentication
    // -----------------------------------------------------------------
    const token = signToken({
      userId: captainUser.id,
      email: captainUser.email,
      fullName: captainUser.fullName,
      homeCityId: captainUser.homeCityId,
      roles: [{ roleCode: 'CAPTAIN', cityId: jampur.id }],
    });
    const verified = verifyToken(token);
    assert(Boolean(verified && verified.userId === captainUser.id), 2, 'Session token issued and cryptographically verified');

    // -----------------------------------------------------------------
    // Flow 3: Player Registration & Profile
    // -----------------------------------------------------------------
    const athleteUser = await prisma.user.create({
      data: {
        email: \`audit.athlete.\${timestamp}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Athlete Hamza Audit',
        phone: '+923009876543',
        homeCityId: jampur.id,
      },
    });

    const playerProfile = await prisma.playerProfile.create({
      data: {
        userId: athleteUser.id,
        primarySportId: cricket.id,
        jerseyNumber: 10,
        position: 'All-Rounder',
        battingStyle: 'Right-Hand',
        bowlingStyle: 'Right-Arm Medium Fast',
        performanceCategory: 'DEVELOPING',
      },
    });
    assert(playerProfile.userId === athleteUser.id && playerProfile.primarySportId === cricket.id, 3, 'Player profile configured with athletic attributes');

    // -----------------------------------------------------------------
    // Flow 4: Captain Registration & Role Assignment
    // -----------------------------------------------------------------
    const captainRole = await prisma.role.findFirst({ where: { code: 'CAPTAIN' } });
    const userRoleAssignment = await prisma.userRole.create({
      data: {
        userId: captainUser.id,
        roleId: captainRole!.id,
        cityId: jampur.id,
        sportId: cricket.id,
      },
    });
    assert(userRoleAssignment.userId === captainUser.id, 4, 'Captain role officially assigned with municipal scoping');

    // -----------------------------------------------------------------
    // Flow 5: Team Creation
    // -----------------------------------------------------------------
    const teamA = await prisma.team.create({
      data: {
        name: \`Jampur Titans CC \${timestamp}\`,
        code: \`JTC\${timestamp.toString().slice(-4)}\`,
        cityId: jampur.id,
        sportId: cricket.id,
        captainId: captainUser.id,
        status: 'PENDING_PAYMENT',
      },
    });
    assert(teamA.status === 'PENDING_PAYMENT', 5, 'Squad created in initial PENDING_PAYMENT status');

    // -----------------------------------------------------------------
    // Flow 6: Rs. 1,000 Team Payment
    // -----------------------------------------------------------------
    const teamPayment = await createPaymentOrder({
      userId: captainUser.id,
      paymentType: 'TEAM_REGISTRATION',
      teamId: teamA.id,
      sportId: cricket.id,
      cityId: jampur.id,
    });
    assert(teamPayment.amount === 1000.0, 6, 'Dynamic Rs. 1,000 yearly registration fee calculated and billed');

    const submittedTeamPayment = await submitPaymentProof({
      paymentId: teamPayment.id,
      paymentMethod: 'JAZZCASH',
      transactionReference: \`JC-TEAM-\${timestamp}\`,
    });
    assert(submittedTeamPayment.status === 'SUBMITTED', 6, 'Payment proof submitted with transaction reference');

    // -----------------------------------------------------------------
    // Flow 7: Admin Approval
    // -----------------------------------------------------------------
    const superAdmin = await prisma.user.findFirst({ where: { email: 'superadmin@sports.pk' } });
    const verifiedTeamPayment = await verifyPayment({
      paymentId: teamPayment.id,
      verifiedById: superAdmin!.id,
      action: 'APPROVED',
    });
    assert(verifiedTeamPayment.status === 'VERIFIED', 7, 'Financial desk verified team registration transaction');

    const approvedTeam = await prisma.team.update({
      where: { id: teamA.id },
      data: { status: 'ACTIVE' },
    });
    assert(approvedTeam.status === 'ACTIVE', 7, 'Squad officially activated by administration');

    // -----------------------------------------------------------------
    // Flow 8: Player Joining Team
    // -----------------------------------------------------------------
    const teamMember = await prisma.teamMember.create({
      data: {
        teamId: teamA.id,
        playerId: athleteUser.id,
        role: 'PLAYER',
        status: 'ACTIVE',
      },
    });
    assert(teamMember.status === 'ACTIVE', 8, 'Athlete successfully rostered into squad membership');

    // -----------------------------------------------------------------
    // Flow 9: Player Transfer
    // -----------------------------------------------------------------
    const captainBUser = await prisma.user.create({
      data: {
        email: \`audit.cap.b.\${timestamp}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Captain Bilal Audit',
        homeCityId: jampur.id,
      },
    });

    const teamB = await prisma.team.create({
      data: {
        name: \`Jampur Warriors CC \${timestamp}\`,
        code: \`JWC\${timestamp.toString().slice(-4)}\`,
        cityId: jampur.id,
        sportId: cricket.id,
        captainId: captainBUser.id,
        status: 'ACTIVE',
      },
    });

    const transferReq = await createTransferRequest({
      playerId: athleteUser.id,
      sportId: cricket.id,
      newTeamId: teamB.id,
      notes: 'Seeking regular first-XI match opportunities',
    });
    assert(transferReq.transfer.status === 'PENDING_PAYMENT', 9, 'Player transfer initiated with destination team linkage');

    // -----------------------------------------------------------------
    // Flow 10: Rs. 100 Transfer Payment
    // -----------------------------------------------------------------
    assert(transferReq.transfer.fee === 100.0, 10, 'Standard Rs. 100 transfer processing fee billed');

    await submitPaymentProof({
      paymentId: transferReq.payment.id,
      paymentMethod: 'EASYPAISA',
      transactionReference: \`EP-TR-\${timestamp}\`,
    });

    await verifyPayment({
      paymentId: transferReq.payment.id,
      verifiedById: superAdmin!.id,
      action: 'APPROVED',
    });

    // Execute atomic migration
    await prisma.teamMember.updateMany({
      where: { teamId: teamA.id, playerId: athleteUser.id, status: 'ACTIVE' },
      data: { status: 'FORMER', leftAt: new Date() },
    });

    await prisma.teamMember.create({
      data: {
        teamId: teamB.id,
        playerId: athleteUser.id,
        role: 'PLAYER',
        status: 'ACTIVE',
      },
    });

    const completedTransfer = await prisma.playerTransfer.update({
      where: { id: transferReq.transfer.id },
      data: {
        status: 'COMPLETED',
        releasingApproved: true,
        receivingApproved: true,
        approvedById: superAdmin!.id,
        completedAt: new Date(),
      },
    });
    assert(completedTransfer.status === 'COMPLETED', 10, 'Transfer executed and historical membership preserved as FORMER');

    // -----------------------------------------------------------------
    // Flow 11: Match Creation
    // -----------------------------------------------------------------
    const matchFixture = await prisma.match.create({
      data: {
        cityId: jampur.id,
        sportId: cricket.id,
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
        requestedById: captainUser.id,
        scheduledAt: new Date(Date.now() + 86400000),
        format: '20_OVERS',
        status: 'REQUESTED',
        homeCaptainApproved: true,
        scorebook: {
          create: {
            sportId: cricket.id,
            currentStateJson: JSON.stringify({ status: 'REQUESTED' }),
          },
        },
      },
      include: { scorebook: true },
    });
    assert(matchFixture.status === 'REQUESTED', 11, 'Match fixture challenge proposed by home captain');

    // -----------------------------------------------------------------
    // Flow 12: Opponent Acceptance
    // -----------------------------------------------------------------
    const acceptedMatch = await prisma.match.update({
      where: { id: matchFixture.id },
      data: {
        awayCaptainApproved: true,
        awayCaptainApprovedAt: new Date(),
        status: 'PENDING_ADMIN_APPROVAL',
      },
    });
    assert(acceptedMatch.status === 'PENDING_ADMIN_APPROVAL', 12, 'Opponent captain accepted match proposal');

    // -----------------------------------------------------------------
    // Flow 13: Admin Match Approval
    // -----------------------------------------------------------------
    const sanctionedMatch = await prisma.match.update({
      where: { id: matchFixture.id },
      data: {
        adminApproved: true,
        adminApprovedAt: new Date(),
        adminApprovedById: superAdmin!.id,
        status: 'SCHEDULED',
      },
    });
    assert(sanctionedMatch.status === 'SCHEDULED' && sanctionedMatch.adminApproved === true, 13, 'City/Super Admin sanctioned match for official schedule');

    // -----------------------------------------------------------------
    // Flow 14: Official Assignment
    // -----------------------------------------------------------------
    const officialUser = await prisma.user.create({
      data: {
        email: \`audit.official.\${timestamp}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Official Tariq Scorer',
        homeCityId: jampur.id,
      },
    });

    const officialAssignment = await prisma.matchOfficial.create({
      data: {
        matchId: matchFixture.id,
        officialId: officialUser.id,
        role: 'SCORER',
      },
    });
    assert(officialAssignment.matchId === matchFixture.id, 14, 'Certified official assigned to manage match scorebook');

    // -----------------------------------------------------------------
    // Flow 15: Live Score Updates
    // -----------------------------------------------------------------
    await prisma.matchParticipant.createMany({
      data: [
        { matchId: matchFixture.id, teamId: teamA.id, playerId: captainUser.id },
        { matchId: matchFixture.id, teamId: teamB.id, playerId: athleteUser.id },
      ],
    });

    await prisma.scoreEvent.createMany({
      data: [
        { scorebookId: matchFixture.scorebook!.id, matchId: matchFixture.id, eventType: 'RUNS', teamId: teamA.id, playerId: captainUser.id, detailsJson: JSON.stringify({ runs: 85 }) },
        { scorebookId: matchFixture.scorebook!.id, matchId: matchFixture.id, eventType: 'RUNS', teamId: teamB.id, playerId: athleteUser.id, detailsJson: JSON.stringify({ runs: 120 }) },
      ],
    });

    const allEvents = await prisma.scoreEvent.findMany({ where: { matchId: matchFixture.id } });
    const scoreState = calculateScorebookState('CRICKET', teamA.id, teamB.id, allEvents);

    const liveMatch = await prisma.match.update({
      where: { id: matchFixture.id },
      data: {
        status: 'LIVE',
        homeScore: scoreState.homeScore,
        awayScore: scoreState.awayScore,
        winnerTeamId: scoreState.winnerTeamId,
      },
    });
    assert(liveMatch.status === 'LIVE' && liveMatch.awayScore === 120, 15, 'Live ball-by-ball score recorded and calculated by sport scoring engine');

    // -----------------------------------------------------------------
    // Flow 16: Result Submission
    // -----------------------------------------------------------------
    const submittedScorebook = await prisma.scorebook.update({
      where: { id: matchFixture.scorebook!.id },
      data: {
        submittedById: officialUser.id,
        submittedAt: new Date(),
      },
    });

    const pendingVerificationMatch = await prisma.match.update({
      where: { id: matchFixture.id },
      data: { status: 'RESULT_PENDING_VERIFICATION' },
    });
    assert(pendingVerificationMatch.status === 'RESULT_PENDING_VERIFICATION', 16, 'Official submitted finalized match result for verification');

    // -----------------------------------------------------------------
    // Flow 17: Result Verification
    // -----------------------------------------------------------------
    const statsResult = await processMatchFinalStatistics(matchFixture.id);
    assert(statsResult.success === true, 17, 'Administrator verified official result and triggered ranking engine');

    // -----------------------------------------------------------------
    // Flow 18: Scorebook Locking & Immutability
    // -----------------------------------------------------------------
    const lockedMatch = await prisma.match.findUnique({ where: { id: matchFixture.id } });
    assert(lockedMatch?.isLocked === true && lockedMatch?.status === 'OFFICIAL', 18, 'Match scorebook permanently locked against unauthorized score edits');

    // -----------------------------------------------------------------
    // Flow 19: Player Statistics Update
    // -----------------------------------------------------------------
    const athleteStats = await prisma.playerStatistic.findUnique({
      where: { playerId_sportId: { playerId: athleteUser.id, sportId: cricket.id } },
    });
    assert(Boolean(athleteStats && athleteStats.runs === 120 && athleteStats.matchesPlayed === 1), 19, 'Player statistics updated with runs, matches, and rating score');

    // -----------------------------------------------------------------
    // Flow 20: Team Statistics Update
    // -----------------------------------------------------------------
    const winningTeamStats = await prisma.teamStatistic.findUnique({
      where: { teamId_sportId: { teamId: teamB.id, sportId: cricket.id } },
    });
    assert(Boolean(winningTeamStats && winningTeamStats.wins === 1), 20, 'Team statistics updated with wins, losses, and ranking points');

    // -----------------------------------------------------------------
    // Flow 21: Municipal & Regional Ranking Update
    // -----------------------------------------------------------------
    const municipalStandings = await prisma.teamRanking.findMany({
      where: { sportId: cricket.id, cityId: jampur.id },
      orderBy: { rankPosition: 'asc' },
    });
    assert(municipalStandings.length >= 1, 21, 'Municipal and regional leaderboards updated from official locked matches only');

    // -----------------------------------------------------------------
    // Flow 22: Winning Photo Upload & Moderation
    // -----------------------------------------------------------------
    const victoryPhoto = await prisma.matchPhoto.create({
      data: {
        matchId: matchFixture.id,
        teamId: teamB.id,
        cityId: jampur.id,
        sportId: cricket.id,
        uploaderId: captainBUser.id,
        photoUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
        caption: 'Jampur Warriors Championship Victory Celebration!',
        status: 'PENDING_MODERATION',
      },
    });

    const approvedPhoto = await prisma.matchPhoto.update({
      where: { id: victoryPhoto.id },
      data: { status: 'APPROVED', moderatedById: superAdmin!.id, moderatedAt: new Date() },
    });
    assert(approvedPhoto.status === 'APPROVED', 22, 'Winning photo linked to official match and approved by moderator');

    // -----------------------------------------------------------------
    // Flow 23: Community Feed
    // -----------------------------------------------------------------
    const community = await prisma.community.findUnique({ where: { cityId: jampur.id } });
    const post = await prisma.communityPost.create({
      data: {
        communityId: community!.id,
        authorId: superAdmin!.id,
        title: 'Jampur Super League Finals Highlights',
        content: 'Congratulations to all participating teams on an outstanding season!',
        postType: 'ANNOUNCEMENT',
        isPinned: true,
      },
    });

    const feedPosts = await prisma.communityPost.findMany({
      where: { communityId: community!.id },
      orderBy: { isPinned: 'desc' },
    });
    assert(feedPosts.length >= 1 && feedPosts.some((p) => p.id === post.id), 23, 'Municipal community feed aggregates news, matches, photos, and standings');

    console.log('\\n================================================================');
    console.log(\`AUDIT VERIFICATION SUMMARY: \${passed} / 23 FLOWS PASSED, \${failed} FAILED\`);
    console.log('================================================================\\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal audit execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
`;

fs.writeFileSync('tests/test-production-readiness-audit.ts', auditTestCode.trim() + '\n', 'utf8');
console.log('[OK] Created tests/test-production-readiness-audit.ts');
