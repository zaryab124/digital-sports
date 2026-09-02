const fs = require('fs');

let code = fs.readFileSync('src/app/api/matches/[id]/action/route.ts', 'utf8');
code = code.replace(
  'processMatchFinalStatistics(match.id, auth.userId);',
  'processMatchFinalStatistics(match.id);'
);

fs.writeFileSync('src/app/api/matches/[id]/action/route.ts', code, 'utf8');
console.log('[OK] Fixed processMatchFinalStatistics call in src/app/api/matches/[id]/action/route.ts');
