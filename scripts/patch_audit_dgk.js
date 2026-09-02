const fs = require('fs');

let testCode = fs.readFileSync('tests/test-production-readiness-audit.ts', 'utf8');
testCode = testCode.replace(
  `const dgkhan = await prisma.city.findFirst({ where: { slug: 'dg-khan' } });`,
  `const dgkhan = await prisma.city.findFirst({ where: { OR: [{ slug: 'dera-ghazi-khan' }, { slug: 'dg-khan' }, { code: 'DGK' }] } });`
);

fs.writeFileSync('tests/test-production-readiness-audit.ts', testCode, 'utf8');
console.log('[OK] Updated DG Khan lookup in audit test');
