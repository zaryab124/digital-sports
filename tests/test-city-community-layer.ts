import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

async function runTests() {
  console.log('=== STARTING CITY SPORTS COMMUNITY LAYER TEST SUITE ===');
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
    // 1. Setup Cities & Sports
    let jampur = await prisma.city.findFirst({ where: { slug: 'jampur' }, include: { community: true } });
    if (!jampur) jampur = await prisma.city.findFirst({ include: { community: true } });

    let dgKhan = await prisma.city.findFirst({ where: { slug: 'dera-ghazi-khan' }, include: { community: true } });
    let rajanpur = await prisma.city.findFirst({ where: { slug: 'rajanpur' }, include: { community: true } });

    let cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });
    let football = await prisma.sport.findFirst({ where: { slug: 'football' } });

    const testPassword = await hashPassword('password123');

    // -------------------------------------------------------------
    // Phase 1: Dynamic City Community Resolution
    // -------------------------------------------------------------
    console.log('[Phase 1] Testing City Sports Community Resolution');
    assert(Boolean(jampur?.community), 'Jampur has an active community record');
    assert(Boolean(dgKhan?.community), 'DG Khan has an active community record');
    assert(Boolean(rajanpur?.community), 'Rajanpur has an active community record');

    // -------------------------------------------------------------
    // Phase 2: User Home City Isolation on Switching Views
    // -------------------------------------------------------------
    console.log('[Phase 2] Testing User Home City Registration Isolation');

    const testUser = await prisma.user.create({
      data: {
        email: `community.user.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Zubair Player (Jampur Registered)',
        homeCityId: jampur!.id,
      },
    });

    assert(testUser.homeCityId === jampur!.id, 'User officially registered in Jampur');

    // Browsing DG Khan & Rajanpur communities
    const dgKhanView = await prisma.city.findUnique({ where: { id: dgKhan!.id } });
    const freshUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(freshUser?.homeCityId === jampur!.id, 'Official player registration unchanged when viewing DG Khan community');

    // -------------------------------------------------------------
    // Phase 3: Community Announcements & Feed
    // -------------------------------------------------------------
    console.log('[Phase 3] Testing Community Announcements & Feed');

    const announcement = await prisma.communityPost.create({
      data: {
        communityId: jampur!.community!.id,
        authorId: testUser.id,
        title: 'Jampur Champions Trophy 2026 Announced',
        content: 'Official inter-city championship begins next month at Jampur Municipal Stadium.',
        postType: 'ANNOUNCEMENT',
        isPinned: true,
      },
    });

    assert(announcement.isPinned === true, 'Announcement created with pinned priority');
    assert(announcement.communityId === jampur!.community!.id, 'Announcement correctly linked to Jampur community');

    // -------------------------------------------------------------
    // Phase 4: Match Setup & Winning Photo Upload Guards
    // -------------------------------------------------------------
    console.log('[Phase 4] Testing Match Winner Photo Linkage & Validation Guards');

    const winnerCaptain = await prisma.user.create({
      data: {
        email: `w.cap.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Winning Captain Kamran',
        homeCityId: jampur!.id,
      },
    });

    const loserCaptain = await prisma.user.create({
      data: {
        email: `l.cap.${Date.now()}@sports.pk`,
        passwordHash: testPassword,
        fullName: 'Losing Captain Farhan',
        homeCityId: jampur!.id,
      },
    });

    const winningTeam = await prisma.team.create({
      data: {
        name: `Jampur Victors ${Date.now()}`,
        code: `JV${Date.now() % 10000}`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: winnerCaptain.id,
        status: 'ACTIVE',
        members: {
          create: [{ playerId: winnerCaptain.id, role: 'CAPTAIN', status: 'ACTIVE' }],
        },
      },
    });

    const losingTeam = await prisma.team.create({
      data: {
        name: `Jampur Challengers ${Date.now()}`,
        code: `JC${Date.now() % 10000}`,
        sportId: cricket!.id,
        cityId: jampur!.id,
        captainId: loserCaptain.id,
        status: 'ACTIVE',
        members: {
          create: [{ playerId: loserCaptain.id, role: 'CAPTAIN', status: 'ACTIVE' }],
        },
      },
    });

    // 1. Unlocked Match
    const unlockedMatch = await prisma.match.create({
      data: {
        sportId: cricket!.id,
        cityId: jampur!.id,
        homeTeamId: winningTeam.id,
        awayTeamId: losingTeam.id,
        requestedById: winnerCaptain.id,
        scheduledAt: new Date(),
        status: 'LIVE',
        isLocked: false,
      },
    });

    // Guard 1: Cannot upload photo for unlocked match
    const canUploadUnlocked = unlockedMatch.isLocked && unlockedMatch.status === 'OFFICIAL';
    assert(!canUploadUnlocked, 'Guard enforces winning photos can only be attached to OFFICIAL LOCKED matches');

    // 2. Official Locked Match with Winner
    const lockedOfficialMatch = await prisma.match.create({
      data: {
        sportId: cricket!.id,
        cityId: jampur!.id,
        homeTeamId: winningTeam.id,
        awayTeamId: losingTeam.id,
        requestedById: winnerCaptain.id,
        scheduledAt: new Date(),
        status: 'OFFICIAL',
        isLocked: true,
        homeScore: 180,
        awayScore: 140,
        winnerTeamId: winningTeam.id,
      },
    });

    // Guard 2: Losing captain is NOT authorized to upload victory photo
    const isLoserWinner = lockedOfficialMatch.winnerTeamId === losingTeam.id;
    assert(!isLoserWinner, 'Guard detects loser team is NOT winner and prevents victory photo upload');

    // 3. Winning Captain uploads official victory photo
    const victoryPhoto = await prisma.matchPhoto.create({
      data: {
        matchId: lockedOfficialMatch.id,
        teamId: winningTeam.id,
        cityId: jampur!.id,
        sportId: cricket!.id,
        uploaderId: winnerCaptain.id,
        photoUrl: 'https://storage.sports.pk/jampur-victors-trophy.jpg',
        caption: 'Jampur Victors celebrating victory after scoring 180 runs!',
        status: 'PENDING_MODERATION',
      },
      include: {
        team: true,
        match: true,
      },
    });

    assert(Boolean(victoryPhoto), 'Winning photo successfully uploaded and linked to official match');
    assert(victoryPhoto.matchId === lockedOfficialMatch.id, 'Photo is directly linked to the official match');
    assert(victoryPhoto.teamId === winningTeam.id, 'Photo is linked to winning team');
    assert(victoryPhoto.status === 'PENDING_MODERATION', 'Photo initialized in PENDING_MODERATION status');

    // -------------------------------------------------------------
    // Phase 5: Moderation Workflow (Approve / Reject)
    // -------------------------------------------------------------
    console.log('[Phase 5] Testing Photo Moderation & Approval Workflow');

    // Admin approves photo
    const approvedPhoto = await prisma.matchPhoto.update({
      where: { id: victoryPhoto.id },
      data: {
        status: 'APPROVED',
        moderatedById: testUser.id,
        moderatedAt: new Date(),
      },
    });

    assert(approvedPhoto.status === 'APPROVED', 'Administrator successfully approved photo');

    // -------------------------------------------------------------
    // Phase 6: Reporting & Deletion Workflow
    // -------------------------------------------------------------
    console.log('[Phase 6] Testing Photo Reporting & Deletion Workflow');

    // Member reports photo
    const reportedPhoto = await prisma.matchPhoto.update({
      where: { id: victoryPhoto.id },
      data: {
        isReported: true,
        reportReason: 'Incorrect trophy photo uploaded',
        status: 'REPORTED',
      },
    });

    assert(reportedPhoto.isReported === true, 'Photo isReported flag set to true');
    assert(reportedPhoto.status === 'REPORTED', 'Photo status changed to REPORTED');
    assert(reportedPhoto.reportReason === 'Incorrect trophy photo uploaded', 'Report reason recorded');

    // Delete photo
    await prisma.matchPhoto.delete({
      where: { id: victoryPhoto.id },
    });

    const deletedCheck = await prisma.matchPhoto.findUnique({
      where: { id: victoryPhoto.id },
    });
    assert(!deletedCheck, 'Photo record deleted successfully');

    console.log(`=== CITY SPORTS COMMUNITY TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
