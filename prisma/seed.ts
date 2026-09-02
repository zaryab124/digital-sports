import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log('======================================================');
  console.log('INITIALIZING REAL-BASED DIGITAL SPORTS PLATFORM');
  console.log('======================================================\n');

  // 1. Provinces & Regions
  const punjab = await prisma.province.upsert({
    where: { code: 'PUNJAB' },
    update: {},
    create: { name: 'Punjab', code: 'PUNJAB' },
  });

  const southPunjab = await prisma.region.upsert({
    where: { code: 'SOUTH_PUNJAB' },
    update: {},
    create: {
      name: 'South Punjab',
      code: 'SOUTH_PUNJAB',
      provinceId: punjab.id,
    },
  });

  // 2. Real Municipal Cities & Automated Community Provisioning
  const initialCities = [
    {
      name: 'Jampur',
      slug: 'jampur',
      code: 'JAM',
      description: 'Historical sports hub known for competitive cricket tournaments, football clubs, and vibrant grassroots athletics.',
      imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=60',
    },
    {
      name: 'Dera Ghazi Khan',
      slug: 'dera-ghazi-khan',
      code: 'DGK',
      description: 'Regional headquarters of South Punjab sports with top-tier football stadiums, cricket clubs, and martial arts centers.',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=60',
    },
    {
      name: 'Rajanpur',
      slug: 'rajanpur',
      code: 'RAJ',
      description: 'Fertile district sports ground home to premier volleyball leagues, riverbank athletics, and badminton academies.',
      imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=60',
    },
    {
      name: 'Taunsa',
      slug: 'taunsa',
      code: 'TAU',
      description: 'Fast-growing sports municipality with renowned volleyball clubs and inter-district cricket rivalries.',
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=60',
    },
    {
      name: 'Multan',
      slug: 'multan',
      code: 'MUL',
      description: 'The City of Saints featuring international stadium facilities, premier league football, and first-class cricket academies.',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60',
    },
    {
      name: 'Muzaffargarh',
      slug: 'muzaffargarh',
      code: 'MZG',
      description: 'Active district center with competitive football leagues, cricket clubs, and dedicated snooker parlors.',
      imageUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=60',
    },
    {
      name: 'Layyah',
      slug: 'layyah',
      code: 'LAY',
      description: 'Thriving riverside sports scene celebrating volleyball championships, table tennis clubs, and marathon events.',
      imageUrl: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&fit=crop&q=60',
    },
  ];

  const cityMap: Record<string, any> = {};
  for (const c of initialCities) {
    const city = await prisma.city.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        isActive: true,
        status: 'ACTIVE',
      },
      create: {
        name: c.name,
        slug: c.slug,
        code: c.code,
        description: c.description,
        imageUrl: c.imageUrl,
        regionId: southPunjab.id,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    cityMap[c.code] = city;

    await prisma.community.upsert({
      where: { cityId: city.id },
      update: { isActive: true },
      create: {
        cityId: city.id,
        name: `${city.name} Sports Community`,
        description: `Official digital community hub for athletes, captains, and fans in ${city.name}.`,
        bannerUrl: city.imageUrl,
        isActive: true,
      },
    });
  }
  console.log('[OK] Seeded 7 Municipal Cities & Community Hubs');

  // 3. Sports Categories & 6 Core Sports
  const teamCat = await prisma.sportCategory.upsert({
    where: { name: 'Team Sports' },
    update: {},
    create: { name: 'Team Sports', type: 'TEAM' },
  });

  const indCat = await prisma.sportCategory.upsert({
    where: { name: 'Individual & Racket Sports' },
    update: {},
    create: { name: 'Individual & Racket Sports', type: 'INDIVIDUAL' },
  });

  const initialSports = [
    {
      name: 'Cricket',
      slug: 'cricket',
      code: 'CRICKET',
      icon: '🏏',
      categoryId: teamCat.id,
      isTeamSport: true,
      playersPerTeam: 11,
      minPlayersRequired: 7,
      registrationType: 'TEAM',
      registrationFee: 1500.0,
      description: 'Competitive leather and tape-ball cricket with ball-by-ball score tracking, runs, wickets, and Net Run Rate (NRR) calculations.',
      rules: { overs: 20, maxOversPerBowler: 4, powerplayOvers: 6 },
    },
    {
      name: 'Football',
      slug: 'football',
      code: 'FOOTBALL',
      icon: '⚽',
      categoryId: teamCat.id,
      isTeamSport: true,
      playersPerTeam: 11,
      minPlayersRequired: 7,
      registrationType: 'TEAM',
      registrationFee: 1500.0,
      description: 'Full-pitch 90-minute and 7-a-side football tournaments with goals, cards, and goal-difference standings.',
      rules: { durationMinutes: 90, extraTimeMinutes: 30, penaltyShootout: true },
    },
    {
      name: 'Volleyball',
      slug: 'volleyball',
      code: 'VOLLEYBALL',
      icon: '🏐',
      categoryId: teamCat.id,
      isTeamSport: true,
      playersPerTeam: 6,
      minPlayersRequired: 6,
      registrationType: 'TEAM',
      registrationFee: 1000.0,
      description: 'Fast-paced court volleyball and shooting volleyball championships with set-based scoring (best of 3 or 5).',
      rules: { setsToWin: 3, pointsPerSet: 25, finalSetPoints: 15 },
    },
    {
      name: 'Badminton',
      slug: 'badminton',
      code: 'BADMINTON',
      icon: '🏸',
      categoryId: indCat.id,
      isTeamSport: false,
      playersPerTeam: 1,
      minPlayersRequired: 1,
      registrationType: 'INDIVIDUAL',
      registrationFee: 500.0,
      description: 'Official 21-point rally singles and doubles badminton tournaments with serve and game-point tracking.',
      rules: { scoring: 'RALLY_21', setsToWin: 2, maxSets: 3 },
    },
    {
      name: 'Table Tennis',
      slug: 'table-tennis',
      code: 'TABLE_TENNIS',
      icon: '🏓',
      categoryId: indCat.id,
      isTeamSport: false,
      playersPerTeam: 1,
      minPlayersRequired: 1,
      registrationType: 'INDIVIDUAL',
      registrationFee: 500.0,
      description: 'Precision indoor table tennis singles and doubles championships with 11-point sets.',
      rules: { scoring: 'SETS_AND_POINTS', pointsToWinSet: 11, maxSets: 5 },
    },
    {
      name: 'Snooker',
      slug: 'snooker',
      code: 'SNOOKER',
      icon: '🎱',
      categoryId: indCat.id,
      isTeamSport: false,
      playersPerTeam: 1,
      minPlayersRequired: 1,
      registrationType: 'INDIVIDUAL',
      registrationFee: 800.0,
      description: 'Strategic frame-based cue sports played on standard full-size tables with break and frame tracking.',
      rules: { scoring: 'FRAMES_AND_BREAKS', maxFrames: 7 },
    },
  ];

  for (const s of initialSports) {
    const sport = await prisma.sport.upsert({
      where: { code: s.code },
      update: {
        slug: s.slug,
        icon: s.icon,
        registrationType: s.registrationType,
        registrationFee: s.registrationFee,
        description: s.description,
        isTeamSport: s.isTeamSport,
        playersPerTeam: s.playersPerTeam,
        minPlayersRequired: s.minPlayersRequired,
        rulesJson: JSON.stringify(s.rules),
        isActive: true,
      },
      create: {
        name: s.name,
        slug: s.slug,
        code: s.code,
        icon: s.icon,
        registrationType: s.registrationType,
        registrationFee: s.registrationFee,
        description: s.description,
        categoryId: s.categoryId,
        isTeamSport: s.isTeamSport,
        playersPerTeam: s.playersPerTeam,
        minPlayersRequired: s.minPlayersRequired,
        rulesJson: JSON.stringify(s.rules),
        isActive: true,
      },
    });

    await prisma.rankingRule.upsert({
      where: { sportId: sport.id },
      update: {},
      create: {
        sportId: sport.id,
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        mvpBonusPoints: 5,
        calculationModel: s.code === 'CRICKET' ? 'CRICKET_NRR' : 'STANDARD',
      },
    });
  }
  console.log('[OK] Seeded 6 Sports with Slugs, Icons, Fees & Ranking Rules');

  // 4. City Grounds
  const groundsData = [
    { city: 'JAM', name: 'Jampur Municipal Sports Stadium', address: 'Stadium Road, Jampur', capacity: 3500, sports: ['CRICKET', 'FOOTBALL'] },
    { city: 'JAM', name: 'Govt High School No. 1 Ground', address: 'Circular Road, Jampur', capacity: 1200, sports: ['VOLLEYBALL', 'BADMINTON'] },
    { city: 'DGK', name: 'Divisional Sports Complex DG Khan', address: 'College Road, DG Khan', capacity: 8000, sports: ['CRICKET', 'FOOTBALL', 'VOLLEYBALL', 'TABLE_TENNIS'] },
    { city: 'DGK', name: 'City Sports Gymnasium', address: 'Jampur Road, DG Khan', capacity: 1500, sports: ['BADMINTON', 'TABLE_TENNIS', 'SNOOKER'] },
    { city: 'RAJ', name: 'Rajanpur District Sports Arena', address: 'Kashmore Road, Rajanpur', capacity: 3000, sports: ['FOOTBALL', 'VOLLEYBALL', 'CRICKET'] },
    { city: 'MUL', name: 'Multan District Cricket Ground', address: 'Bosan Road, Multan', capacity: 6000, sports: ['CRICKET', 'FOOTBALL'] },
  ];

  for (const g of groundsData) {
    const existingGround = await prisma.ground.findFirst({
      where: { cityId: cityMap[g.city].id, name: g.name },
    });
    if (!existingGround) {
      await prisma.ground.create({
        data: {
          cityId: cityMap[g.city].id,
          name: g.name,
          address: g.address,
          capacity: g.capacity,
          sportsSupported: JSON.stringify(g.sports),
          isActive: true,
        },
      });
    }
  }
  console.log('[OK] Seeded City Grounds');

  // 5. Configurable Fees
  const defaultFees = [
    { id: 'fee-team-reg', feeType: 'TEAM_REGISTRATION', amount: 1000.0, description: 'Standard yearly team club registration fee' },
    { id: 'fee-ind-reg', feeType: 'INDIVIDUAL_SPORT_REGISTRATION', amount: 500.0, description: 'Annual individual sport athlete registration fee' },
    { id: 'fee-player-transfer', feeType: 'PLAYER_TRANSFER', amount: 100.0, description: 'Standard inter-club player transfer fee' },
  ];
  for (const f of defaultFees) {
    await prisma.feeConfiguration.upsert({
      where: { id: f.id },
      update: { amount: f.amount },
      create: { ...f, currency: 'PKR', isActive: true },
    });
  }
  console.log('[OK] Configured Baseline Fees (Rs. 1,000 Team / Rs. 100 Transfer)');

  // 6. System Roles
  const roleCodes = [
    'SUPER_ADMIN',
    'REGIONAL_ADMIN',
    'CITY_ADMIN',
    'SPORTS_ADMIN',
    'OFFICIAL',
    'CAPTAIN',
    'PLAYER',
    'FAN',
  ];
  const roleMap: Record<string, any> = {};
  for (const code of roleCodes) {
    roleMap[code] = await prisma.role.upsert({
      where: { code },
      update: {},
      create: { name: code.replace(/_/g, ' '), code, description: `${code.replace(/_/g, ' ')} Role` },
    });
  }

  // 7. Single Master Super Administrator Account (NO DEMO / MOCK USERS)
  const masterPasswordHash = await hash('Admin@Sports2026!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sports.pk' },
    update: {
      passwordHash: masterPasswordHash,
      fullName: 'System Administrator',
      status: 'ACTIVE',
      isEmailVerified: true,
    },
    create: {
      email: 'admin@sports.pk',
      passwordHash: masterPasswordHash,
      fullName: 'System Administrator',
      phone: '+92 300 0000000',
      homeCityId: cityMap['JAM'].id,
      isEmailVerified: true,
      status: 'ACTIVE',
      adminProfile: {
        create: {
          designation: 'Chief Administrator & Platform Commissioner',
          department: 'South Punjab Digital Sports Platform',
          officeContact: '+92 300 0000000',
        },
      },
    },
  });

  await prisma.userRole.upsert({
    where: { id: 'master-super-admin-role' },
    update: {},
    create: {
      id: 'master-super-admin-role',
      userId: admin.id,
      roleId: roleMap['SUPER_ADMIN'].id,
    },
  });

  console.log('[OK] Master Super Administrator Account Ready: admin@sports.pk / Admin@Sports2026!');
  console.log('\n--- Platform is clean and ready for real users and real teams! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
