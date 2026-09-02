const fs = require('fs');

let testCode = fs.readFileSync('tests/test-super-admin-dashboard.ts', 'utf8');
testCode = testCode.replace(
  `    const superAdminUser = await prisma.user.create({
      data: {
        email: \`superadmin.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Chief Super Administrator',
        userRoles: {
          create: [{ roleId: superAdminRole.id }],
        },
      },
    });`,
  `    const superAdminUser = await prisma.user.create({
      data: {
        email: \`superadmin.\${Date.now()}@sports.pk\`,
        passwordHash: testPassword,
        fullName: 'Chief Super Administrator',
        homeCityId: jampur!.id,
        userRoles: {
          create: [{ roleId: superAdminRole.id }],
        },
      },
    });`
);

fs.writeFileSync('tests/test-super-admin-dashboard.ts', testCode, 'utf8');
console.log('[OK] Fixed homeCityId in test-super-admin-dashboard.ts');
