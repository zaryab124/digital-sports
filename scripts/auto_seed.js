const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function autoSeed() {
  try {
    const cityCount = await prisma.city.count();
    if (cityCount >= 7) {
      console.log(`[OK] Database already initialized with ${cityCount} cities.`);
      return;
    }

    console.log('[...] Database initializing real structure...');

    // 1. Provinces & Regions
    const punjab = await prisma.province.upsert({
      where: { code: 'PUNJAB' },
      update: {},
      create: { name: 'Punjab', code: 'PUNJAB' },
    });

    const southPunjab = await prisma.region.upsert({
      where: { code: 'SOUTH_PUNJAB' },
      update: {},
      create: { name: 'South Punjab', code: 'SOUTH_PUNJAB', provinceId: punjab.id },
    });

    // 2. Real Municipal Cities
    const initialCities = [
      { name: 'Jampur', slug: 'jampur', code: 'JAM', desc: 'Historical sports hub.' },
      { name: 'Dera Ghazi Khan', slug: 'dera-ghazi-khan', code: 'DGK', desc: 'Regional sports headquarters.' },
      { name: 'Rajanpur', slug: 'rajanpur', code: 'RAJ', desc: 'District sports hub.' },
      { name: 'Taunsa', slug: 'taunsa', code: 'TAU', desc: 'Renowned sports municipality.' },
      { name: 'Multan', slug: 'multan', code: 'MUL', desc: 'Divisional sports capital.' },
      { name: 'Muzaffargarh', slug: 'muzaffargarh', code: 'MZG', desc: 'Active district center.' },
      { name: 'Layyah', slug: 'layyah', code: 'LAY', desc: 'Thriving sports scene.' },
    ];

    const cityMap = {};
    for (const c of initialCities) {
      const city = await prisma.city.upsert({
        where: { code: c.code },
        update: { isActive: true },
        create: {
          name: c.name,
          slug: c.slug,
          code: c.code,
          description: c.desc,
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
          description: `Official digital sports hub for ${city.name}.`,
          isActive: true,
        },
      });
    }

    // 3. Sports Categories & 6 Sports
    const teamCategory = await prisma.sportCategory.upsert({
      where: { name: 'Team Sports' },
      update: {},
      create: { name: 'Team Sports', slug: 'team-sports', description: 'Squad sports' },
    });

    const indCategory = await prisma.sportCategory.upsert({
      where: { name: 'Individual & Racket Sports' },
      update: {},
      create: { name: 'Individual & Racket Sports', slug: 'individual-sports', description: 'Individual sports' },
    });

    const sports = [
      { name: 'Cricket', slug: 'cricket', code: 'CRICKET', icon: '🏏', categoryId: teamCategory.id, isTeamSport: true, registrationFee: 1500 },
      { name: 'Football', slug: 'football', code: 'FOOTBALL', icon: '⚽', categoryId: teamCategory.id, isTeamSport: true, registrationFee: 1500 },
      { name: 'Volleyball', slug: 'volleyball', code: 'VOLLEYBALL', icon: '🏐', categoryId: teamCategory.id, isTeamSport: true, registrationFee: 1000 },
      { name: 'Badminton', slug: 'badminton', code: 'BADMINTON', icon: '🏸', categoryId: indCategory.id, isTeamSport: false, registrationFee: 500 },
      { name: 'Table Tennis', slug: 'table-tennis', code: 'TABLE_TENNIS', icon: '🏓', categoryId: indCategory.id, isTeamSport: false, registrationFee: 500 },
      { name: 'Snooker', slug: 'snooker', code: 'SNOOKER', icon: '🎱', categoryId: indCategory.id, isTeamSport: false, registrationFee: 800 },
    ];

    for (const s of sports) {
      const sport = await prisma.sport.upsert({
        where: { code: s.code },
        update: {},
        create: s,
      });

      await prisma.rankingRule.upsert({
        where: { sportId: sport.id },
        update: {},
        create: { sportId: sport.id, winPoints: 3, drawPoints: 1, lossPoints: 0, mvpBonusPoints: 5 },
      });
    }

    // 4. Default Fees
    await prisma.feeConfiguration.upsert({
      where: { id: 'default-team-reg-fee' },
      update: {},
      create: { id: 'default-team-reg-fee', feeType: 'TEAM_REGISTRATION', amount: 1000.0, currency: 'PKR', isActive: true },
    });
    await prisma.feeConfiguration.upsert({
      where: { id: 'default-player-transfer-fee' },
      update: {},
      create: { id: 'default-player-transfer-fee', feeType: 'PLAYER_TRANSFER', amount: 100.0, currency: 'PKR', isActive: true },
    });

    // 5. Roles
    const roleCodes = ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'CITY_ADMIN', 'SPORTS_ADMIN', 'OFFICIAL', 'CAPTAIN', 'PLAYER', 'FAN'];
    const roleMap = {};
    for (const code of roleCodes) {
      roleMap[code] = await prisma.role.upsert({
        where: { code },
        update: {},
        create: { name: code.replace(/_/g, ' '), code },
      });
    }

    // 6. Master Super Administrator
    const pwHash = await bcrypt.hash('Admin@Sports2026!', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@sports.pk' },
      update: {},
      create: {
        email: 'admin@sports.pk',
        passwordHash: pwHash,
        fullName: 'System Administrator',
        homeCityId: cityMap['JAM'].id,
        isEmailVerified: true,
        status: 'ACTIVE',
      },
    });

    await prisma.userRole.upsert({
      where: { id: 'master-super-admin-role' },
      update: {},
      create: { id: 'master-super-admin-role', userId: admin.id, roleId: roleMap['SUPER_ADMIN'].id },
    });

    console.log('[OK] Real-based auto seed completed with 1 Master Admin (admin@sports.pk).');
  } catch (err) {
    console.error('[WARN] Auto-seed notice:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

autoSeed();
