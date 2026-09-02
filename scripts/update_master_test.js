const fs = require('fs');

let masterTest = fs.readFileSync('tests/run-all-tests.ts', 'utf8');

if (!masterTest.includes('TEST SUITE 7: Real-Time Event Bus & 14 Notification Types')) {
  const insertBefore = `  console.log('\\n==================================================');
  console.log(\`TEST SUMMARY: \${passed} PASSED, \${failed} FAILED\`);`;

  const newTestSuite = `  // TEST SUITE 7: Real-Time Event Bus & 14 Notification Types
  console.log('\\n--- TEST SUITE 7: Real-Time Event Bus & 14 Notification Types ---');
  const { realtimeBus, publishUserEvent, publishMatchEvent, publishGlobalEvent } = await import('../src/lib/realtime');
  const { sendNotification, broadcastNotification } = await import('../src/services/notification-service');

  let rtUserReceived = false;
  let rtMatchReceived = false;
  let rtRankingsReceived = false;

  realtimeBus.once(\`user:\${superAdmin!.id}\`, (msg) => {
    if (msg.eventType === 'NOTIFICATION') rtUserReceived = true;
  });
  realtimeBus.once('match:match-test-99', (msg) => {
    if (msg.eventType === 'MATCH_SCORE_UPDATE') rtMatchReceived = true;
  });
  realtimeBus.once('global', (msg) => {
    if (msg.eventType === 'RANKINGS_UPDATE') rtRankingsReceived = true;
  });

  publishUserEvent(superAdmin!.id, 'NOTIFICATION', { title: 'Master Test Alert' });
  publishMatchEvent('match-test-99', 'MATCH_SCORE_UPDATE', { homeScore: 10 });
  publishGlobalEvent('RANKINGS_UPDATE', { sportId: cricket!.id });

  assert(rtUserReceived, 'Realtime private user channel event published and received');
  assert(rtMatchReceived, 'Realtime match live score channel event published and received');
  assert(rtRankingsReceived, 'Realtime global rankings channel event published and received');

  const required14Types: import('../src/services/notification-service').AppNotificationType[] = [
    'TEAM_APPROVED', 'TEAM_REJECTED', 'MATCH_REQUEST', 'MATCH_ACCEPTED',
    'MATCH_REJECTED', 'MATCH_APPROVED', 'MATCH_CANCELLED', 'TRANSFER_REQUEST',
    'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'PAYMENT_SUBMITTED',
    'PAYMENT_VERIFIED', 'MATCH_RESULT_VERIFIED', 'RANKING_UPDATED'
  ];

  let notifCountCreated = 0;
  for (const nType of required14Types) {
    const notif = await sendNotification({
      userId: superAdmin!.id,
      title: \`Master Test \${nType}\`,
      message: \`Dispatched \${nType}\`,
      notificationType: nType,
      type: 'INFO',
    });
    if (notif && notif.notificationType === nType) notifCountCreated++;
  }
  assert(notifCountCreated === 14, 'All 14 mandatory notification types successfully created in database');

  const unreadNotifs = await prisma.notification.count({ where: { userId: superAdmin!.id, isRead: false } });
  assert(unreadNotifs >= 14, 'Unread notification counter accurately computed');

`;

  masterTest = masterTest.replace(insertBefore, newTestSuite + insertBefore);
  fs.writeFileSync('tests/run-all-tests.ts', masterTest, 'utf8');
  console.log('[OK] Added Real-Time & Notification Suite to run-all-tests.ts');
}
