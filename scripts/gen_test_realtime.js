const fs = require('fs');

const testCode = `import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { realtimeBus, publishUserEvent, publishMatchEvent, publishCityEvent, publishGlobalEvent } from '../src/lib/realtime';
import { sendNotification, broadcastNotification, AppNotificationType } from '../src/services/notification-service';

async function runTests() {
  console.log('=== STARTING REAL-TIME & NOTIFICATION ENGINE TEST SUITE ===');
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
    const testPassword = await hashPassword('password123');
    const jampur = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    const cricket = await prisma.sport.findFirst({ where: { slug: 'cricket' } });

    const captainA = await prisma.user.create({
      data: {
        email: \`rt.cap.a.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Realtime Captain Ali',
        homeCityId: jampur!.id,
      },
    });

    const captainB = await prisma.user.create({
      data: {
        email: \`rt.cap.b.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Realtime Captain Bilal',
        homeCityId: jampur!.id,
      },
    });

    const athlete = await prisma.user.create({
      data: {
        email: \`rt.athlete.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Realtime Athlete Tariq',
        homeCityId: jampur!.id,
      },
    });

    // -------------------------------------------------------------
    // Phase 1: In-Memory Pub-Sub Event Bus Verification
    // -------------------------------------------------------------
    console.log('[Phase 1] Testing In-Memory Pub-Sub Real-Time Event Bus');

    let userEventReceived = false;
    let matchEventReceived = false;
    let rankingsEventReceived = false;

    realtimeBus.once(\`user:\${captainA.id}\`, (msg) => {
      if (msg.eventType === 'NOTIFICATION') userEventReceived = true;
    });

    realtimeBus.once('match:match-123', (msg) => {
      if (msg.eventType === 'MATCH_SCORE_UPDATE' && msg.payload.homeScore === 45) matchEventReceived = true;
    });

    realtimeBus.once('global', (msg) => {
      if (msg.eventType === 'RANKINGS_UPDATE') rankingsEventReceived = true;
    });

    publishUserEvent(captainA.id, 'NOTIFICATION', { title: 'Test Alert' });
    publishMatchEvent('match-123', 'MATCH_SCORE_UPDATE', { homeScore: 45, awayScore: 30 });
    publishGlobalEvent('RANKINGS_UPDATE', { cityId: jampur!.id });

    assert(userEventReceived, 'User private channel real-time event dispatched and received');
    assert(matchEventReceived, 'Match channel live score update event dispatched and received');
    assert(rankingsEventReceived, 'Global rankings update event dispatched and received');

    // -------------------------------------------------------------
    // Phase 2: Complete 14 Notification Types Delivery & Persistence
    // -------------------------------------------------------------
    console.log('[Phase 2] Testing 14 Mandatory Notification Types Persistence');

    const notificationTypes: AppNotificationType[] = [
      'TEAM_APPROVED',
      'TEAM_REJECTED',
      'MATCH_REQUEST',
      'MATCH_ACCEPTED',
      'MATCH_REJECTED',
      'MATCH_APPROVED',
      'MATCH_CANCELLED',
      'TRANSFER_REQUEST',
      'TRANSFER_APPROVED',
      'TRANSFER_REJECTED',
      'PAYMENT_SUBMITTED',
      'PAYMENT_VERIFIED',
      'MATCH_RESULT_VERIFIED',
      'RANKING_UPDATED',
    ];

    for (const nType of notificationTypes) {
      const notif = await sendNotification({
        userId: athlete.id,
        title: \`Notification: \${nType}\`,
        message: \`Real-time automated alert for event \${nType}\`,
        notificationType: nType,
        type: nType.includes('APPROVED') || nType.includes('VERIFIED') ? 'SUCCESS' : 'INFO',
        linkUrl: '/dashboard',
      });

      assert(Boolean(notif), \`Notification type \${nType} created in database\`);
      assert(notif?.notificationType === nType, \`NotificationType attribute correctly recorded as \${nType}\`);
      assert(notif?.isRead === false, 'Notification initialized with unread status (isRead: false)');
    }

    // -------------------------------------------------------------
    // Phase 3: Notifications Querying, Unread Count & Mark-As-Read
    // -------------------------------------------------------------
    console.log('[Phase 3] Testing Notification Retrieval & State Management');

    const userNotifs = await prisma.notification.findMany({
      where: { userId: athlete.id },
      orderBy: { createdAt: 'desc' },
    });

    assert(userNotifs.length >= 14, \`User received \${userNotifs.length} persistent notifications in inbox\`);

    const unreadBefore = await prisma.notification.count({
      where: { userId: athlete.id, isRead: false },
    });
    assert(unreadBefore >= 14, \`Unread notifications count accurately computed as \${unreadBefore}\`);

    // Mark single as read
    const firstNotifId = userNotifs[0].id;
    await prisma.notification.update({
      where: { id: firstNotifId },
      data: { isRead: true },
    });

    const singleCheck = await prisma.notification.findUnique({ where: { id: firstNotifId } });
    assert(singleCheck?.isRead === true, 'Single notification successfully marked as read');

    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId: athlete.id, isRead: false },
      data: { isRead: true },
    });

    const unreadAfter = await prisma.notification.count({
      where: { userId: athlete.id, isRead: false },
    });
    assert(unreadAfter === 0, 'Mark All As Read updated all notification rows to isRead: true');

    // -------------------------------------------------------------
    // Phase 4: Multi-User Broadcast Notification Delivery
    // -------------------------------------------------------------
    console.log('[Phase 4] Testing Multi-User Broadcast Notification');

    const broadcastResults = await broadcastNotification({
      userIds: [captainA.id, captainB.id],
      title: 'South Punjab Sports League Kickoff',
      message: 'Official match fixtures are now live across all municipal hubs.',
      notificationType: 'MATCH_APPROVED',
      type: 'SUCCESS',
    });

    assert(broadcastResults.length === 2, 'Broadcast successfully delivered to multiple target users');
    assert(broadcastResults.every((n) => Boolean(n)), 'All broadcast records confirmed saved in database');

    console.log(\`=== REAL-TIME & NOTIFICATION TESTS COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);
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

fs.writeFileSync('tests/test-realtime-notifications.ts', testCode.trim() + '\n', 'utf8');
console.log('[OK] Created tests/test-realtime-notifications.ts');
