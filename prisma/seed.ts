import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log('--- Starting Comprehensive Seed for Sports Community ---');

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

  // 2. Dynamic Cities with Slugs, Descriptions, and Image URLs
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
        isActive: true,
        status: 'ACTIVE',
      },
    });
    cityMap[c.code] = city;

    // Auto-create Community for each active city
    await prisma.community.upsert({
      where: { cityId: city.id },
      update: {
        name: `${city.name} Sports Community`,
        description: `Official digital community hub for athletes, captains, and fans in ${city.name}.`,
        isActive: true,
      },
      create: {
        cityId: city.id,
        name: `${city.name} Sports Community`,
        description: `Official digital community hub for athletes, captains, and fans in ${city.name}.`,
        bannerUrl: c.imageUrl,
        isActive: true,
      },
    });
  }
  console.log('[OK] Seeded 7 Cities & Automated Communities');

  // 3. Sports Categories & Sports with Slugs, Icons, and Fees
  const teamCat = await prisma.sportCategory.upsert({
    where: { name: 'TEAM_SPORTS' },
    update: {},
    create: { name: 'TEAM_SPORTS', type: 'TEAM' },
  });

  const individualCat = await prisma.sportCategory.upsert({
    where: { name: 'INDIVIDUAL_SPORTS' },
    update: {},
    create: { name: 'INDIVIDUAL_SPORTS', type: 'INDIVIDUAL' },
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
      description: 'The premier sport across South Punjab featuring T20, 40-over, and tape-ball leagues with detailed runs, overs, and wicket tracking.',
      rules: { scoring: 'RUNS_AND_WICKETS', maxOversDefault: 20, ballsPerOver: 6 },
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
      registrationFee: 1200.0,
      description: 'Exciting 90-minute association football competitions with goal, assist, yellow/red card, and foul tracking.',
      rules: { scoring: 'GOALS', halfDurationMinutes: 45, extraTimeEnabled: true },
    },
    {
      name: 'Volleyball',
      slug: 'volleyball',
      code: 'VOLLEYBALL',
      icon: '🏐',
      categoryId: teamCat.id,
      isTeamSport: true,
      playersPerTeam: 6,
      minPlayersRequired: 4,
      registrationType: 'TEAM',
      registrationFee: 1000.0,
      description: 'High-energy best-of-5 sets volleyball action with point rotation and set-win tracking.',
      rules: { scoring: 'SETS_AND_POINTS', pointsToWinSet: 25, maxSets: 5 },
    },
    {
      name: 'Badminton',
      slug: 'badminton',
      code: 'BADMINTON',
      icon: '🏸',
      categoryId: individualCat.id,
      isTeamSport: false,
      playersPerTeam: 1,
      minPlayersRequired: 1,
      registrationType: 'INDIVIDUAL',
      registrationFee: 500.0,
      description: 'Fast-paced singles and doubles badminton tournaments with rally-point scoring up to 21 points.',
      rules: { scoring: 'SETS_AND_POINTS', pointsToWinSet: 21, maxSets: 3 },
    },
    {
      name: 'Table Tennis',
      slug: 'table-tennis',
      code: 'TABLE_TENNIS',
      icon: '🏓',
      categoryId: individualCat.id,
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
      categoryId: individualCat.id,
      isTeamSport: false,
      playersPerTeam: 1,
      minPlayersRequired: 1,
      registrationType: 'INDIVIDUAL',
      registrationFee: 800.0,
      description: 'Strategic frame-based cue sports played on standard full-size tables with break and frame tracking.',
      rules: { scoring: 'FRAMES_AND_BREAKS', maxFrames: 7 },
    },
  ];

  const sportMap: Record<string, any> = {};
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
    sportMap[s.code] = sport;

    // Seed Ranking Rule for sport
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

  // 4. City Grounds with GPS & Sports Capabilities
  const groundsData = [
    { city: 'JAM', name: 'Jampur Municipal Sports Stadium', address: 'Stadium Road, Jampur', capacity: 3500, sports: ['CRICKET', 'FOOTBALL'] },
    { city: 'JAM', name: 'Govt High School No. 1 Ground', address: 'Circular Road, Jampur', capacity: 1200, sports: ['VOLLEYBALL', 'BADMINTON'] },
    { city: 'DGK', name: 'Divisional Sports Complex DG Khan', address: 'College Road, DG Khan', capacity: 8000, sports: ['CRICKET', 'FOOTBALL', 'VOLLEYBALL', 'TABLE_TENNIS'] },
    { city: 'DGK', name: 'City Sports Gymnasium', address: 'Jampur Road, DG Khan', capacity: 1500, sports: ['BADMINTON', 'TABLE_TENNIS', 'SNOOKER'] },
    { city: 'RAJ', name: 'Rajanpur District Sports Arena', address: 'Kashmore Road, Rajanpur', capacity: 3000, sports: ['FOOTBALL', 'VOLLEYBALL', 'CRICKET'] },
    { city: 'MUL', name: 'Multan District Cricket Ground', address: 'Bosan Road, Multan', capacity: 6000, sports: ['CRICKET', 'FOOTBALL'] },
  ];

  for (const g of groundsData) {
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
  console.log('[OK] Seeded City Grounds');

  // 5. Configurable Fees
  const fees = [
    { feeType: 'TEAM_REGISTRATION', amount: 1000.0, description: 'Standard yearly team club registration fee' },
    { feeType: 'INDIVIDUAL_SPORT_REGISTRATION', amount: 500.0, description: 'Annual individual sport athlete registration fee' },
    { feeType: 'PLAYER_TRANSFER', amount: 100.0, description: 'Standard inter-club player transfer fee' },
  ];
  for (const f of fees) {
    await prisma.feeConfiguration.create({ data: f });
  }

  // 6. Roles
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

  // 7. Demo Users with Specialized Profiles
  const defaultPasswordHash = await hash('password123');

  // A. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@sports.pk' },
    update: {},
    create: {
      email: 'superadmin@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Tariq Mehmood',
      homeCityId: cityMap['MUL'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['SUPER_ADMIN'].id }],
      },
      adminProfile: {
        create: {
          designation: 'Chief Administrator & Sports Commissioner',
          department: 'South Punjab Sports Board',
          officeContact: '+92 61 9200111',
        },
      },
    },
  });

  // B. Jampur City Admin
  const jampurAdmin = await prisma.user.upsert({
    where: { email: 'cityadmin.jampur@sports.pk' },
    update: {},
    create: {
      email: 'cityadmin.jampur@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Farooq Leghari',
      homeCityId: cityMap['JAM'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['CITY_ADMIN'].id, cityId: cityMap['JAM'].id }],
      },
      adminProfile: {
        create: {
          designation: 'Jampur City Sports Officer',
          department: 'District Sports Management',
          officeContact: '+92 604 567890',
        },
      },
    },
  });

  // C. DG Khan City Admin
  await prisma.user.upsert({
    where: { email: 'cityadmin.dgkhan@sports.pk' },
    update: {},
    create: {
      email: 'cityadmin.dgkhan@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Malik Zeeshan',
      homeCityId: cityMap['DGK'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['CITY_ADMIN'].id, cityId: cityMap['DGK'].id }],
      },
      adminProfile: {
        create: {
          designation: 'DG Khan Sports Officer',
          department: 'District Sports Board DG Khan',
        },
      },
    },
  });

  // D. Captain Ali (Jampur Lions)
  const captainAli = await prisma.user.upsert({
    where: { email: 'captain.ali@sports.pk' },
    update: {},
    create: {
      email: 'captain.ali@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Ali Raza Khan',
      homeCityId: cityMap['JAM'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['CAPTAIN'].id, cityId: cityMap['JAM'].id, sportId: sportMap['CRICKET'].id }],
      },
      playerProfile: {
        create: {
          primarySportId: sportMap['CRICKET'].id,
          jerseyNumber: 7,
          position: 'Top-Order Batsman & Captain',
          battingStyle: 'Right-hand',
          performanceCategory: 'PROVINCIAL',
          bio: 'Leader of Jampur Lions Cricket Club. Over 10 years playing cricket across South Punjab.',
        },
      },
      captainProfile: {
        create: {
          experienceYears: 6,
          certification: 'PCB Level-1 Coaching & Leadership',
          sportsManagedJson: JSON.stringify([sportMap['CRICKET'].id]),
        },
      },
    },
  });

  // E. Official Ahmed (Verified Umpire / Scorer)
  await prisma.user.upsert({
    where: { email: 'official.ahmed@sports.pk' },
    update: {},
    create: {
      email: 'official.ahmed@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Ahmed Hassan',
      homeCityId: cityMap['JAM'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['OFFICIAL'].id, cityId: cityMap['JAM'].id, sportId: sportMap['CRICKET'].id }],
      },
      officialProfile: {
        create: {
          officialType: 'UMPIRE',
          badgeNumber: 'PCB-UMP-4421',
          licenseLevel: 'REGIONAL',
          experienceYears: 8,
          isVerifiedByAdmin: true,
          bio: 'Certified PCB Regional Panel Umpire and digital scorekeeper.',
        },
      },
    },
  });

  // F. Player Bilal
  const playerBilal = await prisma.user.upsert({
    where: { email: 'player.bilal@sports.pk' },
    update: {},
    create: {
      email: 'player.bilal@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Bilal Gujjar',
      homeCityId: cityMap['JAM'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['PLAYER'].id, cityId: cityMap['JAM'].id, sportId: sportMap['CRICKET'].id }],
      },
      playerProfile: {
        create: {
          primarySportId: sportMap['CRICKET'].id,
          jerseyNumber: 99,
          position: 'Right-arm Fast Bowler',
          bowlingStyle: 'Right-arm fast',
          performanceCategory: 'EMERGING',
          bio: 'Pace bowler clocking 135+ kph with sharp yorkers.',
        },
      },
    },
  });

  // G. Community Fan
  await prisma.user.upsert({
    where: { email: 'fan.sana@sports.pk' },
    update: {},
    create: {
      email: 'fan.sana@sports.pk',
      passwordHash: defaultPasswordHash,
      fullName: 'Sana Fatima',
      homeCityId: cityMap['JAM'].id,
      isEmailVerified: true,
      userRoles: {
        create: [{ roleId: roleMap['FAN'].id, cityId: cityMap['JAM'].id }],
      },
      fanProfile: {
        create: {
          favoriteCityId: cityMap['JAM'].id,
          favoriteSportId: sportMap['CRICKET'].id,
          cheerBio: 'Supporting Jampur cricket and volleyball since 2018! Let’s go Lions!',
        },
      },
    },
  });
  console.log('[OK] Seeded Demo Users with Profiles & RBAC assignments');

  // 8. Seed Active Teams & Roster
  const jampurLions = await prisma.team.upsert({
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
  });

  const dgKhanFalcons = await prisma.team.upsert({
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
  });

  const jampurUnitedFC = await prisma.team.upsert({
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
  });

  // Seed Team Standings
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

  console.log('--- Comprehensive Seed Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
