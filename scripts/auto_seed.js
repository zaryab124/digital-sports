const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function autoSeed() {
  try {
    const cityCount = await prisma.city.count();
    if (cityCount > 0) {
      console.log(`[OK] Database already initialized with ${cityCount} cities. Skipping auto-seed.`);
      return;
    }

    console.log('[...] Database empty. Running initial deployment seed...');
    
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

    // 2. Initial Cities
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
        description: 'Historic divisional capital featuring international stadiums, academies, and provincial championships.',
        imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60',
      },
      {
        name: 'Muzaffargarh',
        slug: 'muzaffargarh',
        code: 'MZG',
        description: 'Industrial sports city with bustling football circuits, district athletics, and snooker clubs.',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60',
      },
      {
        name: 'Layyah',
        slug: 'layyah',
        code: 'LAY',
        description: 'Thriving agricultural hub featuring active football associations, cricket tournaments, and youth clubs.',
        imageUrl: 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=800&auto=format&fit=crop&q=60',
      },
    ];

    for (const cityData of initialCities) {
      const city = await prisma.city.upsert({
        where: { code: cityData.code },
        update: {},
        create: {
          name: cityData.name,
          slug: cityData.slug,
          code: cityData.code,
          description: cityData.description,
          imageUrl: cityData.imageUrl,
          regionId: southPunjab.id,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      await prisma.community.upsert({
        where: { cityId: city.id },
        update: {},
        create: {
          cityId: city.id,
          name: `${city.name} Sports Community`,
          description: `Official digital sports hub for athletes, captains, and clubs in ${city.name}.`,
          bannerUrl: city.imageUrl,
        },
      });
    }

    // 3. Core Sports
    const teamCategory = await prisma.sportCategory.upsert({
      where: { name: 'Team Sports' },
      update: {},
      create: { name: 'Team Sports', slug: 'team-sports', description: 'Squad based athletic disciplines' },
    });

    const individualCategory = await prisma.sportCategory.upsert({
      where: { name: 'Individual & Racket Sports' },
      update: {},
      create: { name: 'Individual & Racket Sports', slug: 'individual-sports', description: 'Singles, doubles and precision disciplines' },
    });

    const initialSports = [
      {
        name: 'Cricket',
        slug: 'cricket',
        code: 'CRICKET',
        icon: '🏏',
        categoryId: teamCategory.id,
        isTeamSport: true,
        teamSize: 11,
        minPlayers: 7,
        maxPlayers: 15,
        matchFormatsJson: JSON.stringify(['T20 (20 Overs)', 'One Day (40 Overs)', 'Tape Ball (10 Overs)']),
        defaultRules: 'Standard PCB Laws with local tournament amendments.',
        registrationType: 'TEAM',
        registrationFee: 1500.0,
      },
      {
        name: 'Football',
        slug: 'football',
        code: 'FOOTBALL',
        icon: '⚽',
        categoryId: teamCategory.id,
        isTeamSport: true,
        teamSize: 11,
        minPlayers: 7,
        maxPlayers: 18,
        matchFormatsJson: JSON.stringify(['90 Mins Standard', '7-a-side Tournament', 'Futsal 5-a-side']),
        defaultRules: 'FIFA Laws of the Game.',
        registrationType: 'TEAM',
        registrationFee: 1500.0,
      },
      {
        name: 'Volleyball',
        slug: 'volleyball',
        code: 'VOLLEYBALL',
        icon: '🏐',
        categoryId: teamCategory.id,
        isTeamSport: true,
        teamSize: 6,
        minPlayers: 6,
        maxPlayers: 12,
        matchFormatsJson: JSON.stringify(['Best of 3 Sets', 'Best of 5 Sets', 'Shooting Volleyball']),
        defaultRules: 'FIVB rules.',
        registrationType: 'TEAM',
        registrationFee: 1000.0,
      },
      {
        name: 'Badminton',
        slug: 'badminton',
        code: 'BADMINTON',
        icon: '🏸',
        categoryId: individualCategory.id,
        isTeamSport: false,
        teamSize: 1,
        minPlayers: 1,
        maxPlayers: 2,
        matchFormatsJson: JSON.stringify(['Singles (Best of 3)', 'Doubles (Best of 3)']),
        defaultRules: 'BWF 21-point rally scoring format.',
        registrationType: 'INDIVIDUAL',
        registrationFee: 500.0,
      },
      {
        name: 'Table Tennis',
        slug: 'table-tennis',
        code: 'TABLE_TENNIS',
        icon: '🏓',
        categoryId: individualCategory.id,
        isTeamSport: false,
        teamSize: 1,
        minPlayers: 1,
        maxPlayers: 2,
        matchFormatsJson: JSON.stringify(['Singles (Best of 5)', 'Doubles (Best of 5)']),
        defaultRules: 'ITTF standard 11-point sets.',
        registrationType: 'INDIVIDUAL',
        registrationFee: 500.0,
      },
      {
        name: 'Snooker',
        slug: 'snooker',
        code: 'SNOOKER',
        icon: '🎱',
        categoryId: individualCategory.id,
        isTeamSport: false,
        teamSize: 1,
        minPlayers: 1,
        maxPlayers: 2,
        matchFormatsJson: JSON.stringify(['Best of 5 Frames', 'Best of 7 Frames', '6-Reds Quick Frame']),
        defaultRules: 'WPBSA official rules.',
        registrationType: 'INDIVIDUAL',
        registrationFee: 500.0,
      },
    ];

    for (const sportData of initialSports) {
      await prisma.sport.upsert({
        where: { code: sportData.code },
        update: {},
        create: sportData,
      });
    }

    // 4. Default Fees
    await prisma.feeConfiguration.upsert({
      where: { id: 'default-team-reg-fee' },
      update: {},
      create: {
        id: 'default-team-reg-fee',
        feeType: 'TEAM_REGISTRATION',
        amount: 1000.0,
        currency: 'PKR',
        description: 'Standard team registration fee',
        isActive: true,
      },
    });

    await prisma.feeConfiguration.upsert({
      where: { id: 'default-player-transfer-fee' },
      update: {},
      create: {
        id: 'default-player-transfer-fee',
        feeType: 'PLAYER_TRANSFER',
        amount: 100.0,
        currency: 'PKR',
        description: 'Standard player transfer NOC fee',
        isActive: true,
      },
    });

    // 5. Super Admin User
    const superAdminRole = await prisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'Super Administrator', code: 'SUPER_ADMIN', level: 1 },
    });

    const jampurCity = await prisma.city.findFirst({ where: { slug: 'jampur' } });
    const pwHash = await bcrypt.hash('Admin@Sports2026!', 12);

    const admin = await prisma.user.upsert({
      where: { email: 'superadmin@sports.pk' },
      update: {},
      create: {
        email: 'superadmin@sports.pk',
        passwordHash: pwHash,
        fullName: 'Executive Super Admin',
        homeCityId: jampurCity.id,
        isEmailVerified: true,
      },
    });

    await prisma.userRole.upsert({
      where: { id: 'super-admin-role-assign' },
      update: {},
      create: {
        id: 'super-admin-role-assign',
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    });

    console.log('[OK] Auto-seed completed successfully!');
  } catch (err) {
    console.error('[WARN] Auto-seed check finished with notice:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

autoSeed();
