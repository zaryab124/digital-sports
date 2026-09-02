const fs = require('fs');

let code = fs.readFileSync('src/app/api/matches/[id]/action/route.ts', 'utf8');
code = code.replace(
  "import { processMatchFinalStatistics } from '@/services/scorebook-service';",
  "import { processMatchFinalStatistics } from '@/services/stats-engine';"
);
code = code.replace(
  'processMatchFinalStatistics(match.id, auth.userId);',
  'processMatchFinalStatistics(match.id);'
);
fs.writeFileSync('src/app/api/matches/[id]/action/route.ts', code, 'utf8');

// Also update gen_match_action_route.js
let genCode = fs.readFileSync('scripts/gen_match_action_route.js', 'utf8');
genCode = genCode.replace(
  "import { processMatchFinalStatistics } from '@/services/scorebook-service';",
  "import { processMatchFinalStatistics } from '@/services/stats-engine';"
);
genCode = genCode.replace(
  'processMatchFinalStatistics(match.id, auth.userId);',
  'processMatchFinalStatistics(match.id);'
);
fs.writeFileSync('scripts/gen_match_action_route.js', genCode, 'utf8');

console.log('[OK] Permanently updated match action route import');
