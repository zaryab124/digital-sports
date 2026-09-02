const fs = require('fs');

let code = fs.readFileSync('src/app/api/matches/[id]/action/route.ts', 'utf8');
code = code.replace(
  "import { processMatchFinalStatistics } from '@/services/scorebook-service';",
  "import { processMatchFinalStatistics } from '@/services/stats-engine';"
);

fs.writeFileSync('src/app/api/matches/[id]/action/route.ts', code, 'utf8');
console.log('[OK] Updated import in src/app/api/matches/[id]/action/route.ts');
