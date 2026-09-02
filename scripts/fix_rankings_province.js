const fs = require('fs');

let code = fs.readFileSync('src/app/api/rankings/route.ts', 'utf8');
code = code.replace(
  `const cities = await prisma.city.findMany({
        include: {
          teams: { where: { status: 'ACTIVE' }, select: { id: true } },
          matches: { where: { isLocked: true }, select: { id: true } },
          region: true,
        },
      });

      const cityRankings = cities.map((c) => ({
        cityId: c.id,
        cityName: c.name,
        citySlug: c.slug,
        province: c.province,
        region: c.region?.name || 'South Punjab',
        activeClubs: c.teams.length,
        officialMatchesPlayed: c.matches.length,
        championshipPoints: (c.teams.length * 10) + (c.matches.length * 25),
      })).sort((a, b) => b.championshipPoints - a.championshipPoints);`,
  `const cities = await prisma.city.findMany({
        include: {
          teams: { where: { status: 'ACTIVE' }, select: { id: true } },
          matches: { where: { isLocked: true }, select: { id: true } },
          region: { include: { province: true } },
        },
      });

      const cityRankings = cities.map((c) => ({
        cityId: c.id,
        cityName: c.name,
        citySlug: c.slug,
        province: c.region?.province?.name || 'Punjab',
        region: c.region?.name || 'South Punjab',
        activeClubs: c.teams.length,
        officialMatchesPlayed: c.matches.length,
        championshipPoints: (c.teams.length * 10) + (c.matches.length * 25),
      })).sort((a, b) => b.championshipPoints - a.championshipPoints);`
);

fs.writeFileSync('src/app/api/rankings/route.ts', code, 'utf8');
console.log('[OK] Updated city rankings province resolution in route.ts');
