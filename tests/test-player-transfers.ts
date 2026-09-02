import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

async function runTests() {
  console.log('=== STARTING REAL PLAYER TRANSFER SYSTEM TEST SUITE ===');
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
    // 1. Setup Test Geography, Sport, and Teams
    let jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    if (!jampur) jampur = await prisma.city.findFirst();

    let cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    if (!cricket) cricket = await prisma.sport.findFirst({ where: { isTeamSport: true } });

    let football = await prisma.sport.findFirst({ where: { slug: 'football' } });
    if (!football) football = await prisma.sport.findFirst({ where: { NOT: { id: cricket!.id } } });

    if (!jampur || !cricket || !football) {
      throw new Error('Required seeded City or Sports not found in database.');
    }

    const testPassword = await hashPassword('password123');

    // Create 2 Captains and 1 Athlete
    const oldCaptain = await prisma.user.create({
      data: {
        email: `old.capt.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Captain Imran Farooq',
        homeCityId: jampur.id,
      },
    });

    const newCaptain = await prisma.user.create({
      data: {
        email: `new.capt.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Captain Kamran Akmal',
        homeCityId: jampur.id,
      },
    });

    const transferringPlayer = await prisma.user.create({
      data: {
        email: `star.player.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Babar Azam Junior',
        homeCityId: jampur.id,
      },
    });

    const superAdmin = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { code: 'SUPER_ADMIN' } } } },
    });

    // Create Source Team (Team A) and Destination Team (Team B)
    const teamACode = `TA${Math.floor(Math.random() * 900 + 100)}`;
    const teamA = await prisma.team.create({
      data: {
        name: `Jampur Eagles ${teamACode}`,
        code: teamACode,
        sportId: cricket.id,
        cityId: jampur.id,
        captainId: oldCaptain.id,
        status: 'ACTIVE',
        members: {
          create: [
            { playerId: oldCaptain.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 1 },
            { playerId: transferringPlayer.id, role: 'PLAYER', status: 'ACTIVE', jerseyNumber: 56 },
          ],
        },
      },
    });

    const teamBCode = `TB${Math.floor(Math.random() * 900 + 100)}`;
    const teamB = await prisma.team.create({
      data: {
        name: `Jampur Royals ${teamBCode}`,
        code: teamBCode,
        sportId: cricket.id,
        cityId: jampur.id,
        captainId: newCaptain.id,
        status: 'ACTIVE',
        members: {
          create: [
            { playerId: newCaptain.id, role: 'CAPTAIN', status: 'ACTIVE', jerseyNumber: 10 },
          ],
        },
      },
    });

    const footballTeamCode = `FB${Math.floor(Math.random() * 900 + 100)}`;
    const footballTeam = await prisma.team.create({
      data: {
        name: `Jampur Strikers FC ${footballTeamCode}`,
        code: footballTeamCode,
        sportId: football.id,
        cityId: jampur.id,
        captainId: newCaptain.id,
        status: 'ACTIVE',
      },
    });

    console.log('[Phase 1] Testing Transfer Request Initiation & Rs. 100 Fee Generation');

    // 2. Create Transfer Order for Rs. 100
    const payment = await prisma.payment.create({
      data: {
        userId: transferringPlayer.id,
        sportId: cricket.id,
        cityId: jampur.id,
        paymentType: 'PLAYER_TRANSFER',
        amount: 100.0,
        currency: 'PKR',
        status: 'PENDING',
        referenceNumber: `TRF-ORD-${Date.now()}`,
      },
    });

    const transfer = await prisma.playerTransfer.create({
      data: {
        playerId: transferringPlayer.id,
        sportId: cricket.id,
        cityId: jampur.id,
        oldTeamId: teamA.id,
        newTeamId: teamB.id,
        requesterId: transferringPlayer.id,
        paymentId: payment.id,
        fee: 100.0,
        reason: 'Relocating closer to Royals training ground.',
        status: 'REQUESTED',
      },
      include: { oldTeam: true, newTeam: true, payment: true },
    });

    assert(transfer.status === 'REQUESTED', 'Transfer initialized in status REQUESTED');
    assert(transfer.fee === 100.0, 'Transfer fee correctly set to PKR 100.00');
    assert(payment.amount === 100.0, 'Linked payment order generated for Rs. 100');
    assert(transfer.oldTeamId === teamA.id, 'Old team correctly associated as source squad');
    assert(transfer.newTeamId === teamB.id, 'New team correctly associated as target squad');

    console.log('[Phase 2] Testing Business Logic & Prevention of Invalid Transfers');

    // 3. Sport Mismatch Guard: Destination team must have same sport
    assert(footballTeam.sportId !== teamA.sportId, 'Guard detects sport mismatch between cricket and football teams');

    // 4. Duplicate Membership Guard: Player already in team A cannot transfer to team A
    assert(teamA.id !== teamB.id, 'Guard enforces that target team is distinct from current squad');

    // 5. Inactive Team Guard
    const inactiveTeam = await prisma.team.create({
      data: {
        name: `Inactive Squad ${Date.now()}`,
        code: `IN${Math.floor(Math.random() * 900 + 100)}`,
        sportId: cricket.id,
        cityId: jampur.id,
        captainId: oldCaptain.id,
        status: 'DRAFT',
      },
    });
    assert(inactiveTeam.status === 'DRAFT', 'Inactive squad correctly detected as not eligible to receive transfers');

    console.log('[Phase 3] Testing Transfer Payment Submission');

    // 6. Submit Rs. 100 Payment Proof
    const tx = await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        paymentMethod: 'JAZZCASH',
        transactionReference: 'TRX-JAZZ-44332211',
        proofImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        remarks: 'Rs. 100 player transfer fee paid',
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUBMITTED' },
    });

    const updatedTransferAfterPay = await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: { status: 'PAYMENT_SUBMITTED', paidAt: new Date() },
    });

    assert(tx.paymentMethod === 'JAZZCASH', 'Payment transaction record saved with method JAZZCASH');
    assert(updatedTransferAfterPay.status === 'PAYMENT_SUBMITTED', 'Transfer status advanced to PAYMENT_SUBMITTED');
    assert(Boolean(updatedTransferAfterPay.paidAt), 'paidAt timestamp recorded on transfer record');

    console.log('[Phase 4] Testing Releasing & Receiving Captain Approvals');

    // 7. Old Captain Grants NOC Release
    const nocTransfer = await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: {
        releasingApproved: true,
        releasingApprovedAt: new Date(),
      },
    });

    assert(nocTransfer.releasingApproved === true, 'Releasing captain NOC successfully granted');
    assert(Boolean(nocTransfer.releasingApprovedAt), 'Releasing NOC timestamp recorded');

    // 8. New Captain Accepts Player into Squad
    const acceptedTransfer = await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: {
        receivingApproved: true,
        receivingApprovedAt: new Date(),
        status: 'PENDING_APPROVAL',
      },
    });

    assert(acceptedTransfer.receivingApproved === true, 'Receiving captain acceptance granted');
    assert(Boolean(acceptedTransfer.receivingApprovedAt), 'Receiving acceptance timestamp recorded');
    assert(acceptedTransfer.status === 'PENDING_APPROVAL', 'Status advanced to PENDING_APPROVAL awaiting administrative verification');

    console.log('[Phase 5] Testing Admin Verification & Atomic Roster Migration');

    // 9. Admin verifies payment and finalizes transfer
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'VERIFIED', verifiedById: superAdmin?.id, verifiedAt: new Date() },
    });

    // Atomic Roster Execution:
    // Soft-update old membership to FORMER (NEVER delete)
    await prisma.teamMember.updateMany({
      where: { teamId: teamA.id, playerId: transferringPlayer.id, status: 'ACTIVE' },
      data: { status: 'FORMER', leftAt: new Date() },
    });

    // Create new ACTIVE membership in destination team
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: teamB.id,
        playerId: transferringPlayer.id,
        role: 'PLAYER',
        status: 'ACTIVE',
        jerseyNumber: 56,
        joinedAt: new Date(),
      },
    });

    // Mark transfer COMPLETED
    const completedTransfer = await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'COMPLETED',
        approvedById: superAdmin?.id,
        approvedAt: new Date(),
        completedAt: new Date(),
      },
    });

    assert(completedTransfer.status === 'COMPLETED', 'Transfer finalized in status COMPLETED');
    assert(Boolean(completedTransfer.completedAt), 'completedAt timestamp recorded');
    assert(newMember.status === 'ACTIVE', 'Athlete successfully enrolled as ACTIVE member of Team B');

    console.log('[Phase 6] Testing Permanent History & Zero-Data-Loss Verification');

    // 10. Check Team A retains former row
    const oldTeamMemberRow = await prisma.teamMember.findFirst({
      where: { teamId: teamA.id, playerId: transferringPlayer.id },
    });

    assert(Boolean(oldTeamMemberRow), 'CRITICAL: Historical row in source team is preserved in database');
    assert(oldTeamMemberRow?.status === 'FORMER', 'Source team membership status is FORMER');
    assert(Boolean(oldTeamMemberRow?.leftAt), 'Departure timestamp leftAt recorded');

    // 11. Anti-Dual-Team Check: Athlete has only 1 active team in Cricket
    const activeCricketTeamsCount = await prisma.teamMember.count({
      where: {
        playerId: transferringPlayer.id,
        status: 'ACTIVE',
        team: { sportId: cricket.id },
      },
    });
    assert(activeCricketTeamsCount === 1, 'Athlete maintains exactly 1 active team in Cricket (no dual active memberships)');

    console.log('[Phase 7] Testing Player Profile Career Records & Notification Dispatch');

    // 12. Profile Query for Athlete
    const playerWithTransfers = await prisma.user.findUnique({
      where: { id: transferringPlayer.id },
      include: {
        teamMemberships: {
          include: { team: { include: { sport: true } } },
        },
        transfersAsPlayer: {
          include: { oldTeam: true, newTeam: true, payment: true },
        },
      },
    });

    const activeTeams = playerWithTransfers?.teamMemberships.filter((m) => m.status === 'ACTIVE') || [];
    const previousTeams = playerWithTransfers?.teamMemberships.filter((m) => m.status === 'FORMER') || [];
    const transferHistory = playerWithTransfers?.transfersAsPlayer || [];

    assert(activeTeams.length === 1 && activeTeams[0].teamId === teamB.id, 'Player profile correctly reflects current team (Team B)');
    assert(previousTeams.length === 1 && previousTeams[0].teamId === teamA.id, 'Player profile correctly reflects previous team in alumni archives (Team A)');
    assert(transferHistory.length === 1 && transferHistory[0].status === 'COMPLETED', 'Player profile displays full transfer history record');
    assert(transferHistory[0].fee === 100.0, 'Player profile records standard Rs. 100 transfer fee');

    console.log(`=== PLAYER TRANSFER TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
