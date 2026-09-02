const fs = require('fs');

// Fix in tests/test-super-admin-dashboard.ts
let testCode = fs.readFileSync('tests/test-super-admin-dashboard.ts', 'utf8');
testCode = testCode.replace(
  `        status: 'ACTIVE',
        isActive: true,
        approvedById: superAdminUser.id,`,
  `        status: 'ACTIVE',
        approvedById: superAdminUser.id,`
);
fs.writeFileSync('tests/test-super-admin-dashboard.ts', testCode, 'utf8');

// Fix in src/app/api/admin/teams/route.ts
let teamsRoute = fs.readFileSync('src/app/api/admin/teams/route.ts', 'utf8');
teamsRoute = teamsRoute.replace(
  `        status: targetStatus,
        isActive: targetStatus === 'ACTIVE',
        approvedById: action === 'APPROVE' ? auth.userId : undefined,`,
  `        status: targetStatus,
        approvedById: action === 'APPROVE' ? auth.userId : undefined,`
);
fs.writeFileSync('src/app/api/admin/teams/route.ts', teamsRoute, 'utf8');

console.log('[OK] Cleaned Team model update calls');
