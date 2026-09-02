const fs = require('fs');

let testCode = fs.readFileSync('tests/test-match-scheduling.ts', 'utf8');
testCode = testCode.replace(
  'const footballTeamCode = `FC${Math.floor(Math.random() * 900 + 100)}`;',
  'const footballTeamCode = `FC${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;'
);
fs.writeFileSync('tests/test-match-scheduling.ts', testCode, 'utf8');
console.log('[OK] Made footballTeamCode unique in test-match-scheduling.ts');
