const fs = require('fs');

let c = fs.readFileSync('tests/test-teams-management.ts', 'utf8');
c = c.replace(/console\.log\('([^']*)\n([^']*)'\)/g, (m, g1, g2) => `console.log('${g1} ${g2}')`);
c = c.replace(/console\.log\('=== STARTING TEAM MANAGEMENT SYSTEM TEST SUITE ===\r?\n'\);/g, "console.log('=== STARTING TEAM MANAGEMENT SYSTEM TEST SUITE ===');");

fs.writeFileSync('tests/test-teams-management.ts', c, 'utf8');
console.log('Fixed tests/test-teams-management.ts');
