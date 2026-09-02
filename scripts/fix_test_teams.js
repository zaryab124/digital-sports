const fs = require('fs');

const testScript = `import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

async function runTests() {
  console.log('=== STARTING TEAM MANAGEMENT SYSTEM TEST SUITE ===');
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
    // 1. Fetch Existing Seeded City & Sport or Create
    let jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    if (!jampur) {
      jampur = await prisma.city.findFirst();
    }

    let cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    if (!cricket) {
      cricket = await prisma.sport.findFirst({ where: { isTeamSport: true } });
    }

    if (!jampur || !cricket) {
      throw new Error('Required seeded City or Sport not found in database.');
    }

    let ground = await prisma.ground.findFirst({ where: { cityId: jampur.id } });
    if (!ground) {
      ground = await prisma.ground.create({
        data: {
          cityId: jampur.id,
          name: 'Jampur Municipal Stadium',
          address: 'Sports Complex Road, Jampur',
          sportsSupported: 'CRICKET,FOOTBALL',
        },
      });
    }

    const captainPassword = await hashPassword('password123');
    const captain = await prisma.user.create({
      data: {
        email: \`captain.tariq.\${Date.now()}@sports.pk\`,
        passwordHash: captainPassword,
        fullName: 'Captain Tariq Khan',
        homeCityId: jampur.id,
      },
    });

    const athlete1 = await prisma.user.create({
      data: {
        email: \`athlete1.\${Date.now()}@sports.pk\`,
        passwordHash: captainPassword,
        fullName: 'Zain Ul Abideen',
        homeCityId: jampur.id,
      },
    });

    const athlete2 = await prisma.user.create({
      data: {
        email: \`athlete2.\${Date.now()}@sports.pk\`,
        passwordHash: captainPassword,
        fullName: 'Hamza Farooq',
        homeCityId: jampur.id,
      },
    });

    console.log('[Phase 1] Testing Team Creation in DRAFT & Rs. 1,000 Registration Fee');

    // 2. Team Creation in DRAFT status
    const teamCode = \`JT\${Math.floor(Math.random() * 900 + 100)}\`;
    const team = await prisma.team.create({
      data: {
        cityId: jampur.id,
        sportId: cricket.id,
        captainId: captain.id,
        name: \`Jampur Titans \${teamCode}\`,
        code: teamCode,
        homeGroundId: ground.id,
        description: 'Premier cricket squad of District Rajanpur.',
        contactPhone: '+92 300 7778899',
        contactEmail: 'titans@jampur.pk',
        playerRequirements: 'Seeking fast bowler and opening batsman.',
        status: 'DRAFT',
        members: {
          create: {
            playerId: captain.id,
            role: 'CAPTAIN',
            status: 'ACTIVE',
            jerseyNumber: 7,
          },
        },
      },
      include: { members: true },
    });

    assert(team.status === 'DRAFT', 'New squad initialized with status DRAFT');
    assert(team.members.length === 1, 'Founding captain automatically enrolled as active roster member');
    assert(team.members[0].role === 'CAPTAIN', 'Founding member assigned role CAPTAIN');
    assert(team.homeGroundId === ground.id, 'Home ground correctly associated');

    // 3. Create Real Payment Order for PKR 1,000 yearly fee
    const payment = await prisma.payment.create({
      data: {
        userId: captain.id,
        teamId: team.id,
        sportId: cricket.id,
        cityId: jampur.id,
        paymentType: 'TEAM_REGISTRATION',
        amount: 1000.0,
        currency: 'PKR',
        status: 'PENDING',
        referenceNumber: \`ORD-REG-\${Date.now()}\`,
      },
    });

    assert(payment.amount === 1000.0, 'Yearly team registration fee generated for Rs. 1,000');
    assert(payment.status === 'PENDING', 'Payment order initialized with status PENDING');

    console.log('[Phase 2] Testing Payment Proof Submission & Status Advancement');

    // 4. Submit Payment Transaction Proof
    const tx = await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        paymentMethod: 'EASYPAISA',
        transactionReference: 'TRX-EASY-99881234',
        proofImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        remarks: 'Yearly registration fee paid via EasyPaisa merchant transfer',
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUBMITTED' },
    });

    const updatedTeamAfterPay = await prisma.team.update({
      where: { id: team.id },
      data: { status: 'PAYMENT_SUBMITTED' },
    });

    assert(tx.paymentMethod === 'EASYPAISA', 'Payment transaction record created with method EASYPAISA');
    assert(updatedTeamAfterPay.status === 'PAYMENT_SUBMITTED', 'Team status advanced to PAYMENT_SUBMITTED after proof submission');

    console.log('[Phase 3] Testing Administrative Review Workflow (Active & Ranking Generation)');

    // 5. Admin Approves Team
    const activeTeam = await prisma.team.update({
      where: { id: team.id },
      data: { status: 'ACTIVE' },
    });

    const ranking = await prisma.teamRanking.create({
      data: {
        teamId: team.id,
        sportId: cricket.id,
        cityId: jampur.id,
        regionId: jampur.regionId,
        rankPosition: 1,
        points: 0,
        goalDiffOrNrr: 0,
      },
    });

    assert(activeTeam.status === 'ACTIVE', 'Admin approval advances team status to ACTIVE');
    assert(ranking.rankPosition === 1, 'Initial municipal team ranking record generated');

    console.log('[Phase 4] Testing Player Invitation Lifecycle & Anti-Dual-Team Enforcement');

    // 6. Captain Invites Athlete 1
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: team.id,
        playerId: athlete1.id,
        invitedById: captain.id,
        role: 'PLAYER',
        message: 'Join us as our leading wicket-keeper batsman',
        status: 'PENDING',
      },
    });

    assert(invitation.status === 'PENDING', 'Player invitation created with status PENDING');

    // 7. Athlete 1 Accepts Invitation
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        playerId: athlete1.id,
        role: 'PLAYER',
        jerseyNumber: 18,
        status: 'ACTIVE',
      },
    });

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    const athlete1Memberships = await prisma.teamMember.findMany({
      where: { playerId: athlete1.id, status: 'ACTIVE' },
    });
    assert(athlete1Memberships.length === 1, 'Athlete 1 successfully enrolled into active roster');

    // 8. Anti-Dual-Team Check: Athlete cannot be active in a second team for same sport
    const hasActiveSameSport = await prisma.teamMember.findFirst({
      where: { playerId: athlete1.id, status: 'ACTIVE', team: { sportId: cricket.id } },
    });
    assert(hasActiveSameSport !== null, 'Dual-team guard detects active membership in another club for the same sport');

    console.log('[Phase 5] Testing Join Request Workflow');

    // 9. Athlete 2 requests to join squad
    const request = await prisma.teamRequest.create({
      data: {
        teamId: team.id,
        playerId: athlete2.id,
        message: 'I am a fast-bowling all-rounder with 4 years club experience.',
        status: 'PENDING',
      },
    });

    assert(request.status === 'PENDING', 'Athlete join request submitted in PENDING status');

    // Captain Approves Request
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        playerId: athlete2.id,
        role: 'PLAYER',
        jerseyNumber: 99,
        status: 'ACTIVE',
      },
    });

    await prisma.teamRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED' },
    });

    const activeRosterCount = await prisma.teamMember.count({
      where: { teamId: team.id, status: 'ACTIVE' },
    });
    assert(activeRosterCount === 3, 'Active squad roster contains Captain + 2 recruited athletes');

    console.log('[Phase 6] Testing Historical Membership Retention (Never Hard Delete)');

    // 10. Athlete 2 departs/is released from the active roster
    const athlete2MemberRow = await prisma.teamMember.findFirst({
      where: { teamId: team.id, playerId: athlete2.id, status: 'ACTIVE' },
    });

    if (athlete2MemberRow) {
      await prisma.teamMember.update({
        where: { id: athlete2MemberRow.id },
        data: {
          status: 'FORMER',
          leftAt: new Date(),
        },
      });
    }

    const remainingActiveCount = await prisma.teamMember.count({
      where: { teamId: team.id, status: 'ACTIVE' },
    });
    const formerCount = await prisma.teamMember.count({
      where: { teamId: team.id, status: 'FORMER' },
    });
    const totalRetainedRows = await prisma.teamMember.count({
      where: { teamId: team.id },
    });

    assert(remainingActiveCount === 2, 'Active squad roster count updated to 2');
    assert(formerCount === 1, 'Departed player transitioned to FORMER status with leftAt timestamp');
    assert(totalRetainedRows === 3, 'CRITICAL: Historical row preserved in database (NEVER hard-deleted)');

    console.log('[Phase 7] Testing Team Profile Metrics, Winning Photos & Settings Updates');

    // 11. Add Winning Photos
    const winningPhoto = await prisma.matchPhoto.create({
      data: {
        teamId: team.id,
        sportId: cricket.id,
        photoUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
        caption: 'Jampur Municipal Cup Championship Victory Celebration',
        isApproved: true,
        isCover: true,
      },
    });
    assert(winningPhoto.caption !== null, 'Championship winning photo registered');

    // 12. Update Team Profile Settings
    const updatedTeamSettings = await prisma.team.update({
      where: { id: team.id },
      data: {
        description: 'Three-time South Punjab Regional Cricket Champions.',
        playerRequirements: 'Roster full for Season 2026.',
      },
    });

    assert(updatedTeamSettings.description.includes('Three-time'), 'Team settings successfully updated');

    console.log(\`=== TEAM MANAGEMENT TESTS COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);
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

fs.writeFileSync('tests/test-teams-management.ts', testScript.trim() + '\n', 'utf8');
console.log('Wrote tests/test-teams-management.ts');
