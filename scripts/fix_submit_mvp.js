const fs = require('fs');

let submitCode = fs.readFileSync('src/app/api/scorebook/[matchId]/submit/route.ts', 'utf8');
submitCode = submitCode.replace(
  `const scorebook = await prisma.scorebook.upsert({
      where: { matchId: match.id },
      update: {
        submittedById: auth.userId,
        submittedAt: new Date(),
        mvpPlayerId: mvpPlayerId || undefined,
      },
      create: {
        matchId: match.id,
        sportId: match.sportId,
        submittedById: auth.userId,
        submittedAt: new Date(),
        mvpPlayerId: mvpPlayerId || undefined,
      },
    });`,
  `const scorebook = await prisma.scorebook.upsert({
      where: { matchId: match.id },
      update: {
        submittedById: auth.userId,
        submittedAt: new Date(),
      },
      create: {
        matchId: match.id,
        sportId: match.sportId,
        submittedById: auth.userId,
        submittedAt: new Date(),
      },
    });`
);

fs.writeFileSync('src/app/api/scorebook/[matchId]/submit/route.ts', submitCode, 'utf8');
console.log('[OK] Updated src/app/api/scorebook/[matchId]/submit/route.ts');
