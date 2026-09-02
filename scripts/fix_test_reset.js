const fs = require('fs');

let testCode = fs.readFileSync('tests/test-super-admin-dashboard.ts', 'utf8');
testCode = testCode.replace(
  `    console.log(\`=== SUPER ADMIN DASHBOARD TESTS COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);`,
  `    // Reset Fee Configurations for clean test idempotency
    await prisma.feeConfiguration.updateMany({
      where: { feeType: 'TEAM_REGISTRATION' },
      data: { amount: 1000.0 },
    });
    await prisma.feeConfiguration.updateMany({
      where: { feeType: 'PLAYER_TRANSFER' },
      data: { amount: 100.0 },
    });

    console.log(\`=== SUPER ADMIN DASHBOARD TESTS COMPLETE: \${passed} PASSED, \${failed} FAILED ===\`);`
);

fs.writeFileSync('tests/test-super-admin-dashboard.ts', testCode, 'utf8');
console.log('[OK] Added clean fee reset in test-super-admin-dashboard.ts');
