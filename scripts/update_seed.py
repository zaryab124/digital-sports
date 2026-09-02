import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated seed script:', path)

seed_content = """import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Comprehensive Seed for Sports Community ---');

  // Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.matchPhoto.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.paymentVerification.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.playerTransfer.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeConfiguration.deleteMany();
  await prisma.playerRanking.deleteMany();
  await prisma.teamRanking.deleteMany();
  await prisma.rankingRule.deleteMany();
  await prisma.playerStatistic.deleteMany();
  await prisma.teamStatistic.deleteMany();
  await prisma.playerMatchStatistic.deleteMany();
  await prisma.teamMatchStatistic.deleteMany();
  await prisma.scoreEvent.deleteMany();
  await prisma.scorebook.deleteMany();
  await prisma.matchOfficial.deleteMany();
  await prisma.matchParticipant.deleteMany();
  await prisma.match.deleteMany();
  await prisma.teamRequest.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.ground.deleteMany();
  await prisma.sport.deleteMany();
  await prisma.sportCategory.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.captainProfile.deleteMany();
  await prisma.officialProfile.deleteMany();
  await prisma.fanProfile.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.community.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();
  await prisma.region.deleteMany();
  await prisma.province.deleteMany();

  // 1. Province & Region
  const punjab = await prisma.province.create({
    data: { name: 'Punjab', code: 'PB' },
  });

  const southPunjab = await prisma.region.create({
    data: { name: 'South Punjab', code: 'SPB', provinceId: punjab.id },
  });

  // 2. Initial Cities
  const cityData = [
    { name: 'Jampur', code: 'JMP', description: 'Hub of Dasti, Jatoi, and Southern Punjab sports talent.' },
    { name: 'Dera Ghazi Khan', code: 'DGK', description: 'Divisional sports headquarters with rich sports traditions.' },
    { name: 'Rajanpur', code: 'RJP', description: 'Home to premier football and volleyball regional tournaments.' },
    { name: 'Taunsa', code: 'TNS', description: 'Famous for enthusiastic cricket and badminton leagues.' },
    { name: 'Multan', code: 'MUX', description: 'City of Saints with national level cricket & football stadiums.' },
    { name: 'Muzaffargarh', code: 'MZG', description: 'Vibrant sports community with emerging youth talent.' },
    { name: 'Layyah', code: 'LYH', description: 'Desert and riverine athletic hub with strong sports spirit.' },
  ];

  const createdCities: Record<string, any> = {};
  for (const c of cityData) {
    const city = await prisma.city.create({
      data: {
        name: c.name,
        code: c.code,
        regionId: southPunjab.id,
        community: {
          create: {
            name: `${c.name} Sports Community`,
            description: c.description,
            bannerUrl: `https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80`,
          },
        },
      },
      include: { community: true },
    });
    createdCities[c.name] = city;
  }
  console.log(`[OK] Seeded ${Object.keys(createdCities).length} Cities`);

  // 3. Sport Categories & Sports
  const teamCat = await prisma.sportCategory.create({
    data: { name: 'TEAM_SPORTS', type: 'TEAM' },
  });
  const indCat = await prisma.sportCategory.create({
    data: { name: 'INDIVIDUAL_SPORTS', type: 'INDIVIDUAL' },
  });

  const sportsMap: Record<string, any> = {};
  const sportsData = [
    { name: 'Cricket', code: 'CRICKET', categoryId: teamCat.id, isTeamSport: true, playersPerTeam: 11, minPlayers: 8 },
    { name: 'Football', code: 'FOOTBALL', categoryId: teamCat.id, isTeamSport: true, playersPerTeam: 11, minPlayers: 7 },
    { name: 'Volleyball', code: 'VOLLEYBALL', categoryId: teamCat.id, isTeamSport: true, playersPerTeam: 6, minPlayers: 4 },
    { name: 'Badminton', code: 'BADMINTON', categoryId: indCat.id, isTeamSport: false, playersPerTeam: 1, minPlayers: 1 },
    { name: 'Table Tennis', code: 'TABLE_TENNIS', categoryId: indCat.id, isTeamSport: false, playersPerTeam: 1, minPlayers: 1 },
    { name: 'Snooker', code: 'SNOOKER', categoryId: indCat.id, isTeamSport: false, playersPerTeam: 1, minPlayers: 1 },
  ];

  for (const s of sportsData) {
    const sport = await prisma.sport.create({
      data: {
        name: s.name,
        code: s.code,
        categoryId: s.categoryId,
        isTeamSport: s.isTeamSport,
        playersPerTeam: s.playersPerTeam,
        minPlayersRequired: s.minPlayers,
      },
    });
    sportsMap[s.code] = sport;

    await prisma.rankingRule.create({
      data: {
        sportId: sport.id,
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        mvpBonusPoints: 5,
        calculationModel: 'STANDARD',
      },
    });
  }
  console.log(`[OK] Seeded ${Object.keys(sportsMap).length} Sports`);

  // 4. Configurable Fees
  await prisma.feeConfiguration.createMany({
    data: [
      { feeType: 'TEAM_REGISTRATION', amount: 1000.0, currency: 'PKR', description: 'Yearly official team registration fee' },
      { feeType: 'INDIVIDUAL_SPORT_REGISTRATION', amount: 500.0, currency: 'PKR', description: 'Individual athlete registration fee' },
      { feeType: 'PLAYER_TRANSFER', amount: 100.0, currency: 'PKR', description: 'Official player club transfer fee' },
    ],
  });

  // 5. Roles
  const roles = [
    { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Full global system administration' },
    { code: 'REGIONAL_ADMIN', name: 'Regional Administrator', description: 'Manages South Punjab regional sports network' },
    { code: 'CITY_ADMIN', name: 'City Administrator', description: 'City-level management & approval authority' },
    { code: 'SPORTS_ADMIN', name: 'Sports Administrator', description: 'Sport-specific authority across region' },
    { code: 'OFFICIAL', name: 'Match Official / Scorer', description: 'Certified match scorer and umpire/referee' },
    { code: 'CAPTAIN', name: 'Team Captain', description: 'Team captain with roster and match proposal authority' },
    { code: 'PLAYER', name: 'Player / Athlete', description: 'Registered athlete participating in leagues' },
    { code: 'FAN', name: 'Community Fan', description: 'Sports enthusiast following teams and scorebooks' },
  ];

  const rolesMap: Record<string, any> = {};
  for (const r of roles) {
    const role = await prisma.role.create({ data: r });
    rolesMap[r.code] = role;
  }

  // 6. Demo Users (Password: password123)
  const passwordHash = await bcrypt.hash('password123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@sports.pk',
      passwordHash,
      fullName: 'Dr. Tariq Malik',
      phone: '+92 300 0000001',
      homeCityId: createdCities['Multan'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['SUPER_ADMIN'].id }],
      },
      adminProfile: {
        create: {
          designation: 'Chief Platform Director',
          department: 'Punjab Sports Directorate',
        },
      },
    },
  });

  const jampurAdmin = await prisma.user.create({
    data: {
      email: 'cityadmin.jampur@sports.pk',
      passwordHash,
      fullName: 'Malik Zafar Dasti',
      phone: '+92 300 0000003',
      homeCityId: createdCities['Jampur'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['CITY_ADMIN'].id, cityId: createdCities['Jampur'].id }],
      },
      adminProfile: {
        create: {
          designation: 'District Sports Officer Jampur',
          department: 'Jampur Sports Board',
        },
      },
    },
  });

  const dgkhanAdmin = await prisma.user.create({
    data: {
      email: 'cityadmin.dgkhan@sports.pk',
      passwordHash,
      fullName: 'Sardar Farooq Leghari',
      phone: '+92 300 0000004',
      homeCityId: createdCities['Dera Ghazi Khan'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['CITY_ADMIN'].id, cityId: createdCities['Dera Ghazi Khan'].id }],
      },
      adminProfile: {
        create: {
          designation: 'Divisional Sports Officer DG Khan',
          department: 'DG Khan Sports Board',
        },
      },
    },
  });

  const officialAhmed = await prisma.user.create({
    data: {
      email: 'official.ahmed@sports.pk',
      passwordHash,
      fullName: 'Ahmed Raza (Official)',
      phone: '+92 300 0000006',
      homeCityId: createdCities['Jampur'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['OFFICIAL'].id, cityId: createdCities['Jampur'].id }],
      },
      officialProfile: {
        create: {
          badgeNumber: 'PCB-OFF-8821',
          licenseLevel: 'REGIONAL',
          officialType: 'SCORER',
          experienceYears: 6,
          isVerifiedByAdmin: true,
          bio: 'PCB Level-2 Certified Scorer & Umpire',
        },
      },
    },
  });

  const captainAli = await prisma.user.create({
    data: {
      email: 'captain.ali@sports.pk',
      passwordHash,
      fullName: 'Ali Hassan (Captain)',
      phone: '+92 300 0000007',
      homeCityId: createdCities['Jampur'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['CAPTAIN'].id, cityId: createdCities['Jampur'].id, sportId: sportsMap['CRICKET'].id }],
      },
      captainProfile: {
        create: {
          experienceYears: 7,
          certification: 'Level-1 Leadership Certificate',
          bio: 'Captain of Jampur Lions Cricket Club since 2021',
        },
      },
      playerProfile: {
        create: {
          primarySportId: sportsMap['CRICKET'].id,
          jerseyNumber: 7,
          position: 'All-Rounder',
          battingStyle: 'Right-hand',
          bowlingStyle: 'Right-arm medium fast',
          performanceCategory: 'EXCELLENT',
        },
      },
    },
  });

  const playerBilal = await prisma.user.create({
    data: {
      email: 'player.bilal@sports.pk',
      passwordHash,
      fullName: 'Bilal Khan',
      phone: '+92 300 0000010',
      homeCityId: createdCities['Jampur'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['PLAYER'].id, cityId: createdCities['Jampur'].id, sportId: sportsMap['CRICKET'].id }],
      },
      playerProfile: {
        create: {
          primarySportId: sportsMap['CRICKET'].id,
          jerseyNumber: 10,
          position: 'Fast Bowler',
          bowlingStyle: 'Right-arm express fast',
          battingStyle: 'Right-hand',
          performanceCategory: 'ADVANCED',
          bio: 'Express strike fast bowler representing Jampur youth.',
        },
      },
    },
  });

  const fanSana = await prisma.user.create({
    data: {
      email: 'fan.sana@sports.pk',
      passwordHash,
      fullName: 'Sana Tariq',
      phone: '+92 300 0000013',
      homeCityId: createdCities['Multan'].id,
      isEmailVerified: true,
      isPhoneVerified: true,
      userRoles: {
        create: [{ roleId: rolesMap['FAN'].id }],
      },
      fanProfile: {
        create: {
          favoriteCityId: createdCities['Jampur'].id,
          favoriteSportId: sportsMap['CRICKET'].id,
          cheerBio: 'Proud supporter of South Punjab cricket & football leagues!',
        },
      },
    },
  });

  console.log('[OK] Seeded Demo Users with Profiles & RBAC assignments');

  // 7. Sports Grounds
  const jampurGround = await prisma.ground.create({
    data: {
      cityId: createdCities['Jampur'].id,
      name: 'Quaid-e-Azam Sports Stadium Jampur',
      address: 'Near Dasti Chowk, Indus Highway, Jampur',
      sportsSupported: 'CRICKET,FOOTBALL,VOLLEYBALL',
      capacity: 3500,
    },
  });

  const dgkGround = await prisma.ground.create({
    data: {
      cityId: createdCities['Dera Ghazi Khan'].id,
      name: 'Divisional Sports Complex DG Khan',
      address: 'Airport Road, Dera Ghazi Khan',
      sportsSupported: 'CRICKET,FOOTBALL,BADMINTON,TABLE_TENNIS',
      capacity: 8000,
    },
  });

  // 8. Teams
  const jampurLions = await prisma.team.create({
    data: {
      cityId: createdCities['Jampur'].id,
      sportId: sportsMap['CRICKET'].id,
      captainId: captainAli.id,
      name: 'Jampur Lions Cricket Club',
      code: 'JLCC',
      status: 'ACTIVE',
      members: {
        create: [
          { playerId: captainAli.id, role: 'CAPTAIN', jerseyNumber: 7, status: 'ACTIVE' },
          { playerId: playerBilal.id, role: 'PLAYER', jerseyNumber: 10, status: 'ACTIVE' },
        ],
      },
      teamStats: {
        create: {
          sportId: sportsMap['CRICKET'].id,
          matchesPlayed: 4,
          wins: 3,
          losses: 1,
          draws: 0,
          points: 9,
          rankScore: 195.0,
        },
      },
    },
  });

  const dgkEagles = await prisma.team.create({
    data: {
      cityId: createdCities['Dera Ghazi Khan'].id,
      sportId: sportsMap['CRICKET'].id,
      captainId: superAdmin.id,
      name: 'DG Khan Eagles CC',
      code: 'DGKE',
      status: 'ACTIVE',
      members: {
        create: [
          { playerId: superAdmin.id, role: 'CAPTAIN', jerseyNumber: 1, status: 'ACTIVE' },
        ],
      },
      teamStats: {
        create: {
          sportId: sportsMap['CRICKET'].id,
          matchesPlayed: 3,
          wins: 2,
          losses: 1,
          draws: 0,
          points: 6,
          rankScore: 160.0,
        },
      },
    },
  });

  // 9. Initial Rankings
  await prisma.teamRanking.create({
    data: {
      teamId: jampurLions.id,
      sportId: sportsMap['CRICKET'].id,
      cityId: createdCities['Jampur'].id,
      regionId: southPunjab.id,
      rankPosition: 1,
      points: 9,
      goalDiffOrNrr: 1.85,
    },
  });

  await prisma.teamRanking.create({
    data: {
      teamId: dgkEagles.id,
      sportId: sportsMap['CRICKET'].id,
      cityId: createdCities['Dera Ghazi Khan'].id,
      regionId: southPunjab.id,
      rankPosition: 2,
      points: 6,
      goalDiffOrNrr: 0.95,
    },
  });

  await prisma.playerRanking.create({
    data: {
      playerId: captainAli.id,
      sportId: sportsMap['CRICKET'].id,
      cityId: createdCities['Jampur'].id,
      regionId: southPunjab.id,
      rankPosition: 1,
      points: 540.0,
      performanceRating: 540.0,
    },
  });

  await prisma.playerRanking.create({
    data: {
      playerId: playerBilal.id,
      sportId: sportsMap['CRICKET'].id,
      cityId: createdCities['Jampur'].id,
      regionId: southPunjab.id,
      rankPosition: 2,
      points: 380.0,
      performanceRating: 380.0,
    },
  });

  // 10. Community Post
  await prisma.communityPost.create({
    data: {
      communityId: createdCities['Jampur'].community.id,
      authorId: jampurAdmin.id,
      title: 'South Punjab Regional Cricket Championship Announced',
      content: 'Official registrations are now open for teams across Jampur, DG Khan, Rajanpur, Taunsa, and Multan. Matches commence this Friday at Quaid-e-Azam Stadium Jampur.',
      postType: 'ANNOUNCEMENT',
      isPinned: true,
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
"""

write_file('prisma/seed.ts', seed_content)
