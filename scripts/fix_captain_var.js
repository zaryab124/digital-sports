const fs = require('fs');

let cap = fs.readFileSync('src/app/captain/page.tsx', 'utf8');

cap = cap.replace(
  'fetch(`/api/transfers?teamId=${teamId}`)',
  'fetch(`/api/transfers?teamId=${id}`)'
);

cap = cap.replace(
  /loadTeamData\(team\.id\);/g,
  'if (selectedTeamId) loadTeamDetails(selectedTeamId);'
);

fs.writeFileSync('src/app/captain/page.tsx', cap, 'utf8');
console.log('[OK] Fixed variable name in src/app/captain/page.tsx');
