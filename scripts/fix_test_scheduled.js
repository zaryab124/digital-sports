const fs = require('fs');

let testCode = fs.readFileSync('tests/test-statistics-rankings.ts', 'utf8');
testCode = testCode.replace(
  `status: 'LIVE',
        isLocked: false,`,
  `status: 'LIVE',
        isLocked: false,
        scheduledAt: new Date(),`
);

fs.writeFileSync('tests/test-statistics-rankings.ts', testCode, 'utf8');
console.log('[OK] Added scheduledAt in test');
