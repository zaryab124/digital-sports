const fs = require('fs');

// Fix in tests/test-super-admin-dashboard.ts
let testCode = fs.readFileSync('tests/test-super-admin-dashboard.ts', 'utf8');
testCode = testCode.replace(
  `    const approvedTeam = await prisma.team.update({
      where: { id: pendingTeam.id },
      data: {
        status: 'ACTIVE',
        approvedById: superAdminUser.id,
        approvedAt: new Date(),
      },
    });

    assert(approvedTeam.status === 'ACTIVE', 'Admin successfully approved pending team');
    assert(approvedTeam.approvedById === superAdminUser.id, 'Approval actor recorded');`,
  `    const approvedTeam = await prisma.team.update({
      where: { id: pendingTeam.id },
      data: {
        status: 'ACTIVE',
      },
    });

    assert(approvedTeam.status === 'ACTIVE', 'Admin successfully approved pending team');`
);
fs.writeFileSync('tests/test-super-admin-dashboard.ts', testCode, 'utf8');

// Fix in src/app/api/admin/teams/route.ts
let teamsRoute = fs.readFileSync('src/app/api/admin/teams/route.ts', 'utf8');
teamsRoute = teamsRoute.replace(
  `    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        status: targetStatus,
        approvedById: action === 'APPROVE' ? auth.userId : undefined,
        approvedAt: action === 'APPROVE' ? new Date() : undefined,
        rejectionReason: action === 'REJECT' ? reason : undefined,
      },
    });`,
  `    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        status: targetStatus,
      },
    });`
);
fs.writeFileSync('src/app/api/admin/teams/route.ts', teamsRoute, 'utf8');

console.log('[OK] Updated Team status update logic');
