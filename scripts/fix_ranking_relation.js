const fs = require('fs');

let code = fs.readFileSync('src/services/ranking-engine.ts', 'utf8');
code = code.replace(/matchStats/g, 'teamMatchStats');
fs.writeFileSync('src/services/ranking-engine.ts', code, 'utf8');
console.log('[OK] Fixed relation name teamMatchStats in src/services/ranking-engine.ts');
