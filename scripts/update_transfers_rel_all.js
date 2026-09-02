const fs = require('fs');

let testScript = fs.readFileSync('tests/test-player-transfers.ts', 'utf8');
testScript = testScript.replace(
  'transfers: {',
  'transfersAsPlayer: {'
);
testScript = testScript.replace(
  'const transferHistory = playerWithTransfers?.transfers || [];',
  'const transferHistory = playerWithTransfers?.transfersAsPlayer || [];'
);

fs.writeFileSync('tests/test-player-transfers.ts', testScript, 'utf8');
console.log('Updated tests/test-player-transfers.ts');

let pageProf = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
pageProf = pageProf.replace(/user\.transfers\b/g, '(user.transfersAsPlayer || user.transfers || [])');
fs.writeFileSync('src/app/profile/page.tsx', pageProf, 'utf8');
console.log('Updated src/app/profile/page.tsx');
