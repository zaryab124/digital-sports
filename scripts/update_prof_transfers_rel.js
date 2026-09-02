const fs = require('fs');

let prof = fs.readFileSync('src/app/api/users/profile/route.ts', 'utf8');
prof = prof.replace(
  'transfers: {',
  'transfersAsPlayer: {'
);

fs.writeFileSync('src/app/api/users/profile/route.ts', prof, 'utf8');
console.log('Updated src/app/api/users/profile/route.ts with transfersAsPlayer');
