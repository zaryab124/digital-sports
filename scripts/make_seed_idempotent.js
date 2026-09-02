const fs = require('fs');

let seedCode = fs.readFileSync('prisma/seed.ts', 'utf8');

// Replace team.create with upsert
seedCode = seedCode.replace(
  /const jampurLions = await prisma\.team\.create\(\{[\s\S]*?\}\);/m,
  `const jampurLions = await prisma.team.upsert({
    where: { cityId_sportId_code: { cityId: cityMap['JAM'].id, sportId: sportMap['CRICKET'].id, code: 'JLCC' } },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Jampur Lions CC',
      code: 'JLCC',
      cityId: cityMap['JAM'].id,
      sportId: sportMap['CRICKET'].id,
      captainId: captainAli.id,
      status: 'ACTIVE',
      members: {
        create: [
          { playerId: captainAli.id, role: 'CAPTAIN', jerseyNumber: 7, status: 'ACTIVE' },
          { playerId: playerBilal.id, role: 'PLAYER', jerseyNumber: 99, status: 'ACTIVE' },
        ],
      },
    },
  });`
);

seedCode = seedCode.replace(
  /const dgKhanFalcons = await prisma\.team\.create\(\{[\s\S]*?\}\);/m,
  `const dgKhanFalcons = await prisma.team.upsert({
    where: { cityId_sportId_code: { cityId: cityMap['DGK'].id, sportId: sportMap['CRICKET'].id, code: 'DGKF' } },
    update: { status: 'ACTIVE' },
    create: {
      name: 'DG Khan Falcons',
      code: 'DGKF',
      cityId: cityMap['DGK'].id,
      sportId: sportMap['CRICKET'].id,
      captainId: superAdmin.id,
      status: 'ACTIVE',
      members: {
        create: [
          { playerId: superAdmin.id, role: 'CAPTAIN', jerseyNumber: 10, status: 'ACTIVE' },
        ],
      },
    },
  });`
);

seedCode = seedCode.replace(
  /const jampurUnitedFC = await prisma\.team\.create\(\{[\s\S]*?\}\);/m,
  `const jampurUnitedFC = await prisma.team.upsert({
    where: { cityId_sportId_code: { cityId: cityMap['JAM'].id, sportId: sportMap['FOOTBALL'].id, code: 'JUFC' } },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Jampur United Football Club',
      code: 'JUFC',
      cityId: cityMap['JAM'].id,
      sportId: sportMap['FOOTBALL'].id,
      captainId: captainAli.id,
      status: 'ACTIVE',
    },
  });`
);

fs.writeFileSync('prisma/seed.ts', seedCode, 'utf8');
console.log('[OK] Made prisma/seed.ts teams idempotent');
