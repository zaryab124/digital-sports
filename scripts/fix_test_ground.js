const fs = require('fs');

let testCode = fs.readFileSync('tests/test-match-scheduling.ts', 'utf8');
testCode = testCode.replace(
  "address: 'Dajal Road, Jampur',",
  "address: 'Dajal Road, Jampur',\n          sportsSupported: 'CRICKET,FOOTBALL',"
);

fs.writeFileSync('tests/test-match-scheduling.ts', testCode, 'utf8');
console.log('[OK] Updated tests/test-match-scheduling.ts with sportsSupported');
