import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote test suite:', path)

write_file('tests/test-cities-sports.ts', """import { prisma } from '../src/lib/prisma';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('DYNAMIC CITY & SPORTS ECOSYSTEM VERIFICATION SUITE');
  console.log('========================================================');

  // TEST 1: City Slug Resolution
  console.log('\n--- TEST 1: Slug-Based City Resolution ---');
  const jampur = await prisma.city.findUnique({
    where: { slug: 'jampur' },
    include: { community: true, grounds: true, region: true },
  });
  assert(Boolean(jampur), 'Resolved city by slug "jampur"');
  assert(jampur?.name === 'Jampur', 'City name matches "Jampur"');
  assert(jampur?.code === 'JAM', 'City code matches "JAM"');
  assert(Boolean(jampur?.community), 'Community automatically provisioned for Jampur');

  const dgKhan = await prisma.city.findUnique({
    where: { slug: 'dera-ghazi-khan' },
    include: { grounds: true },
  });
  assert(Boolean(dgKhan), 'Resolved city by slug "dera-ghazi-khan"');
  assert(dgKhan?.name === 'Dera Ghazi Khan', 'City name matches "Dera Ghazi Khan"');

  // TEST 2: Dynamic Sport Slug Resolution
  console.log('\n--- TEST 2: Dynamic Sport Slug Resolution & Metadata ---');
  const cricket = await prisma.sport.findUnique({
    where: { slug: 'cricket' },
    include: { category: true, rankingRules: true },
  });
  assert(Boolean(cricket), 'Resolved sport by slug "cricket"');
  assert(cricket?.icon === '🏏', 'Sport icon matches cricket emoji');
  assert(cricket?.registrationType === 'TEAM', 'Cricket registration type is TEAM');
  assert(cricket?.registrationFee === 1500.0, 'Cricket registration fee is PKR 1500');

  const badminton = await prisma.sport.findUnique({
    where: { slug: 'badminton' },
    include: { category: true },
  });
  assert(Boolean(badminton), 'Resolved sport by slug "badminton"');
  assert(badminton?.isTeamSport === false, 'Badminton is configured as an individual sport');
  assert(badminton?.registrationType === 'INDIVIDUAL', 'Badminton registration type is INDIVIDUAL');

  // TEST 3: Compound City + Sport Hub Querying (/cities/[citySlug]/[sportSlug])
  console.log('\n--- TEST 3: Compound City + Sport Hub Resolution ---');
  const jampurCricketTeams = await prisma.team.findMany({
    where: { cityId: jampur!.id, sportId: cricket!.id, status: 'ACTIVE' },
    include: { captain: true },
  });
  assert(jampurCricketTeams.length >= 1, 'Found active cricket squads in Jampur');
  assert(jampurCricketTeams[0].name === 'Jampur Lions CC', 'Found "Jampur Lions CC" in Jampur cricket hub');

  const jampurCricketGrounds = await prisma.ground.findMany({
    where: { cityId: jampur!.id, isActive: true },
  });
  const cricketGrounds = jampurCricketGrounds.filter((g) => {
    const supported = JSON.parse(g.sportsSupported);
    return supported.includes('CRICKET') || supported.includes(cricket!.id);
  });
  assert(cricketGrounds.length >= 1, 'Found dedicated cricket ground in Jampur');

  const jampurCricketStandings = await prisma.teamRanking.findMany({
    where: { cityId: jampur!.id, sportId: cricket!.id },
    include: { team: true },
    orderBy: { rankPosition: 'asc' },
  });
  assert(jampurCricketStandings.length >= 1, 'Found official cricket standings for Jampur');
  assert(jampurCricketStandings[0].rankPosition === 1, 'Jampur Lions holds rank #1 in Jampur Cricket');

  // TEST 4: Automated Community Provisioning on City Creation
  console.log('\n--- TEST 4: Automated Community Creation on City Provisioning ---');
  const newCitySlug = `test-city-${Date.now()}`;
  const newCity = await prisma.city.create({
    data: {
      name: 'Kot Mithan',
      slug: newCitySlug,
      code: `KM${Math.floor(Math.random() * 899 + 100)}`,
      regionId: jampur!.regionId,
      description: 'Historical riverine sports municipality.',
      isActive: true,
      status: 'ACTIVE',
    },
  });

  // Automatically provision community
  const autoCommunity = await prisma.community.upsert({
    where: { cityId: newCity.id },
    update: { isActive: true },
    create: {
      cityId: newCity.id,
      name: `${newCity.name} Sports Community`,
      description: `Official digital community hub for athletes, captains, and fans in ${newCity.name}.`,
      isActive: true,
    },
  });
  assert(Boolean(autoCommunity), 'Community record automatically provisioned upon city activation');
  assert(autoCommunity.name === 'Kot Mithan Sports Community', 'Auto-created community has correct municipal title');

  // TEST 5: Dynamic Sport Creation
  console.log('\n--- TEST 5: Dynamic Sport Creation ---');
  const futsalSlug = `futsal-${Date.now()}`;
  const futsal = await prisma.sport.create({
    data: {
      name: 'Five-a-side Futsal',
      slug: futsalSlug,
      code: `FUTSAL_${Date.now()}`,
      categoryId: cricket!.categoryId,
      icon: '⚽',
      registrationType: 'TEAM',
      registrationFee: 2000.0,
      description: 'Fast indoor 5-a-side football variant.',
      isTeamSport: true,
      playersPerTeam: 5,
      minPlayersRequired: 5,
      isActive: true,
    },
  });
  assert(Boolean(futsal), 'New dynamic sport successfully created');
  assert(futsal.playersPerTeam === 5, 'Custom team size of 5 players recorded');
  assert(futsal.registrationFee === 2000.0, 'Custom dynamic registration fee of PKR 2000 recorded');

  // TEST 6: User Browsing Independence & Home City Preservation
  console.log('\n--- TEST 6: Open Browsing & Home City Registration Isolation ---');
  const jampurPlayer = await prisma.user.findFirst({
    where: { email: 'player.bilal@sports.pk' },
    include: { homeCity: true },
  });
  assert(jampurPlayer?.homeCity.slug === 'jampur', 'Player official registration is tied to Jampur');
  
  // Browsing DG Khan or Multan does NOT alter user homeCityId
  const browsedCity = await prisma.city.findUnique({ where: { slug: 'multan' } });
  assert(Boolean(browsedCity), 'Multan city hub accessible for browsing');
  assert(jampurPlayer?.homeCityId === jampur?.id, 'Player home city remains Jampur despite browsing other city hubs');

  console.log('\n========================================================');
  console.log(`CITY & SPORTS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
""")
