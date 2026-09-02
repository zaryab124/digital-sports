const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const cities = await prisma.city.findMany();
  const sports = await prisma.sport.findMany();
  console.log('Cities:', cities.map(c => ({ id: c.id, name: c.name, slug: c.slug, code: c.code })));
  console.log('Sports:', sports.map(s => ({ id: s.id, name: s.name, slug: s.slug, code: s.code })));
}

check().finally(() => prisma.$disconnect());
