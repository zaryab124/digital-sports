const fs = require('fs');

let seedCode = fs.readFileSync('prisma/seed.ts', 'utf8');

// Replace teamRanking.create with deleteMany + create
seedCode = seedCode.replace(
  /\/\/ Seed Team Standings[\s\S]*?console\.log\('--- Comprehensive Seed Completed Successfully! ---'\);/m,
  `// Seed Team Standings
  await prisma.teamRanking.deleteMany({
    where: { teamId: { in: [jampurLions.id, dgKhanFalcons.id] } },
  });

  await prisma.teamRanking.create({
    data: {
      teamId: jampurLions.id,
      sportId: sportMap['CRICKET'].id,
      cityId: cityMap['JAM'].id,
      regionId: southPunjab.id,
      rankPosition: 1,
      points: 12,
      goalDiffOrNrr: 1.45,
    },
  });

  await prisma.teamRanking.create({
    data: {
      teamId: dgKhanFalcons.id,
      sportId: sportMap['CRICKET'].id,
      cityId: cityMap['DGK'].id,
      regionId: southPunjab.id,
      rankPosition: 2,
      points: 8,
      goalDiffOrNrr: 0.85,
    },
  });

  console.log('--- Comprehensive Seed Completed Successfully! ---');`
);

fs.writeFileSync('prisma/seed.ts', seedCode, 'utf8');
console.log('Updated seed.ts team rankings');
