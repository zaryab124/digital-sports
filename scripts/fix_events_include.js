const fs = require('fs');

let code = fs.readFileSync('src/app/api/scorebook/[matchId]/events/route.ts', 'utf8');
code = code.replace(
  `include: {
        player: { select: { id: true, fullName: true } },
      },`,
  ''
);
fs.writeFileSync('src/app/api/scorebook/[matchId]/events/route.ts', code, 'utf8');
console.log('[OK] Fixed ScoreEvent creation in events route');
