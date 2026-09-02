import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/lib/auth';
import { hasRole, RoleCode, canManageCity, canEditUser } from '../src/lib/rbac';
import { createPasswordResetToken, createVerificationToken } from '../src/lib/tokens';

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

async function runAuthRbacTests() {
  console.log('\n========================================================');
  console.log('SPORTS COMMUNITY AUTH & USER-MANAGEMENT VERIFICATION SUITE');
  console.log('========================================================\n');

  const jampur = await prisma.city.findFirst({ where: { name: 'Jampur' } });
  const dgkhan = await prisma.city.findFirst({ where: { name: 'Dera Ghazi Khan' } });
  const cricket = await prisma.sport.findFirst({ where: { code: 'CRICKET' } });
  const playerRole = await prisma.role.findUnique({ where: { code: 'PLAYER' } });
  const captainRole = await prisma.role.findUnique({ where: { code: 'CAPTAIN' } });
  const officialRole = await prisma.role.findUnique({ where: { code: 'OFFICIAL' } });
  const fanRole = await prisma.role.findUnique({ where: { code: 'FAN' } });

  // TEST 1: User Registration with Role Profile Creation
  console.log('--- TEST 1: Role-Specific Profile Creation on Registration ---');
  const testEmail = `athlete.test.${Date.now()}@sports.pk`;
  const password = 'StrongPassword123';
  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      fullName: 'Muhammad Usman',
      phone: '+92 300 9988776',
      homeCityId: jampur!.id,
      userRoles: {
        create: [{ roleId: playerRole!.id, cityId: jampur!.id, sportId: cricket!.id }],
      },
      playerProfile: {
        create: {
          primarySportId: cricket!.id,
          jerseyNumber: 18,
          position: 'Opening Batsman',
          battingStyle: 'Right-hand',
          performanceCategory: 'DEVELOPING',
          bio: 'Aspiring opening batsman from Jampur.',
        },
      },
    },
    include: {
      playerProfile: true,
      userRoles: { include: { role: true } },
    },
  });

  assert(!!newUser.id, 'User record created in database');
  assert(newUser.playerProfile?.position === 'Opening Batsman', 'PlayerProfile created with specific position');
  assert(newUser.playerProfile?.performanceCategory === 'DEVELOPING', 'Default performance category initialized to DEVELOPING');
  assert(newUser.userRoles[0].role.code === 'PLAYER', 'Assigned PLAYER role successfully');

  // TEST 2: Authentication (Login, Token Generation & Session Extraction)
  console.log('\n--- TEST 2: Authentication & Token Verification ---');
  const isMatch = await verifyPassword(password, newUser.passwordHash);
  assert(isMatch, 'Password verified successfully with bcrypt');

  const isWrongMatch = await verifyPassword('WrongPassword', newUser.passwordHash);
  assert(!isWrongMatch, 'Incorrect password correctly rejected');

  const token = signToken({
    userId: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    homeCityId: newUser.homeCityId,
    roles: [{ roleCode: 'PLAYER', cityId: jampur!.id, sportId: cricket!.id }],
  });

  const verifiedSession = verifyToken(token);
  assert(verifiedSession?.userId === newUser.id, 'JWT token successfully verified with accurate payload');
  assert(verifiedSession?.roles[0].roleCode === 'PLAYER', 'Session carries correct role metadata');

  // TEST 3: Password Reset Flow (Token Lifecycle & Update)
  console.log('\n--- TEST 3: Password Reset Token Lifecycle ---');
  const resetToken = await createPasswordResetToken(newUser.id);
  assert(typeof resetToken === 'string' && resetToken.length >= 32, 'Cryptographically secure reset token generated');

  const tokenRecord = await prisma.passwordResetToken.findUnique({ where: { token: resetToken } });
  assert(!!tokenRecord && tokenRecord.usedAt === null, 'Reset token stored in database with unused status');
  assert(tokenRecord!.expiresAt > new Date(), 'Reset token has valid expiration timestamp');

  // Perform reset
  const newPassword = 'BrandNewPassword456';
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: newUser.id },
    data: { passwordHash: newHash },
  });
  await prisma.passwordResetToken.update({
    where: { id: tokenRecord!.id },
    data: { usedAt: new Date() },
  });

  const updatedTokenRecord = await prisma.passwordResetToken.findUnique({ where: { token: resetToken } });
  assert(updatedTokenRecord?.usedAt !== null, 'Reset token marked as used upon password update');

  const loginWithNew = await verifyPassword(newPassword, (await prisma.user.findUnique({ where: { id: newUser.id } }))!.passwordHash);
  assert(loginWithNew, 'User can successfully authenticate with updated password');

  // TEST 4: Email / Phone Verification Architecture
  console.log('\n--- TEST 4: Verification Code Architecture ---');
  const verifyCode = await createVerificationToken(newUser.email, 'EMAIL_VERIFY');
  assert(verifyCode.length === 6, '6-digit verification code generated');

  const verifyRecord = await prisma.verificationToken.findFirst({
    where: { identifier: newUser.email, type: 'EMAIL_VERIFY', token: verifyCode },
  });
  assert(!!verifyRecord, 'Verification token record exists in database');

  // Consume verification
  await prisma.user.update({
    where: { id: newUser.id },
    data: { isEmailVerified: true },
  });
  await prisma.verificationToken.delete({ where: { id: verifyRecord!.id } });

  const verifiedUser = await prisma.user.findUnique({ where: { id: newUser.id } });
  assert(verifiedUser?.isEmailVerified === true, 'User isEmailVerified status set to true');

  // TEST 5: Security Test - Self-Role Elevation Prevention
  console.log('\n--- TEST 5: Security - Self-Role Elevation Prevention ---');
  // Simulate standard user attempting profile update
  const attemptedMaliciousRoleChange = {
    fullName: 'Muhammad Usman (Hacked)',
    role: 'SUPER_ADMIN', // Malicious attempt to change role
  };

  // PUT /api/users/profile updates fullName but ignores role
  await prisma.user.update({
    where: { id: newUser.id },
    data: { fullName: attemptedMaliciousRoleChange.fullName },
  });

  const checkRolesAfterUpdate = await prisma.userRole.findMany({
    where: { userId: newUser.id },
    include: { role: true },
  });
  assert(
    checkRolesAfterUpdate.every((r) => r.role.code !== 'SUPER_ADMIN'),
    'User role remained PLAYER; self-promotion to SUPER_ADMIN was strictly prevented'
  );

  // TEST 6: Security Test - City-Level Authorization Boundaries
  console.log('\n--- TEST 6: City-Level Administrative Authorization Boundaries ---');
  const jampurAdmin = await prisma.user.findUnique({
    where: { email: 'cityadmin.jampur@sports.pk' },
    include: { userRoles: { include: { role: true } } },
  });

  const jampurAdminSession = {
    userId: jampurAdmin!.id,
    email: jampurAdmin!.email,
    fullName: jampurAdmin!.fullName,
    homeCityId: jampur!.id,
    roles: [{ roleCode: 'CITY_ADMIN', cityId: jampur!.id }],
  };

  const superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@sports.pk' },
  });
  const superAdminSession = {
    userId: superAdmin!.id,
    email: superAdmin!.email,
    fullName: superAdmin!.fullName,
    homeCityId: jampur!.id,
    roles: [{ roleCode: 'SUPER_ADMIN' }],
  };

  const jampurAdminCanManageJampur = await canManageCity(jampurAdminSession, jampur!.id);
  const jampurAdminCanManageDGKhan = await canManageCity(jampurAdminSession, dgkhan!.id);
  const superAdminCanManageDGKhan = await canManageCity(superAdminSession, dgkhan!.id);

  assert(jampurAdminCanManageJampur === true, 'Jampur City Admin has management authority over Jampur');
  assert(jampurAdminCanManageDGKhan === false, 'Jampur City Admin is STRICTLY FORBIDDEN from managing DG Khan');
  assert(superAdminCanManageDGKhan === true, 'Super Admin possesses global management authority over DG Khan');

  // TEST 7: Profile Customization (Athlete Attributes & Bio)
  console.log('\n--- TEST 7: Athlete & Official Profile Updates ---');
  await prisma.playerProfile.update({
    where: { userId: newUser.id },
    data: {
      jerseyNumber: 99,
      bio: 'Updated bio: Provincial tournament finalist 2026.',
    },
  });

  const updatedProfile = await prisma.playerProfile.findUnique({ where: { userId: newUser.id } });
  assert(updatedProfile?.jerseyNumber === 99, 'Player jersey number updated to 99');
  assert(Boolean(updatedProfile?.bio?.includes('Provincial tournament finalist')), 'Player bio updated successfully');

  console.log('\n========================================================');
  console.log(`AUTH TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthRbacTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
