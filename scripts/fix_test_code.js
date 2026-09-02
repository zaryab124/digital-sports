const fs = require('fs');

let testCode = fs.readFileSync('tests/test-teams-management.ts', 'utf8');
testCode = testCode.replace(
  "code: 'DGT',",
  "code: `DT${Math.floor(Math.random() * 9000 + 1000)}`,"
);

fs.writeFileSync('tests/test-teams-management.ts', testCode, 'utf8');
console.log('Fixed opponent team code randomizer in tests/test-teams-management.ts');
