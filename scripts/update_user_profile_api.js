const fs = require('fs');

let profileRoute = fs.readFileSync('src/app/api/users/profile/route.ts', 'utf8');

// Replace GET method query in profileRoute
profileRoute = profileRoute.replace(
  /teamMemberships: \{[\s\S]*?\},/m,
  `teamMemberships: {
          include: { team: { include: { sport: true, city: true, captain: { select: { fullName: true } } } } },
          orderBy: { joinedAt: 'desc' },
        },
        transfers: {
          include: {
            oldTeam: true,
            newTeam: true,
            sport: true,
            city: true,
            payment: { include: { transactions: true } },
            approvedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },`
);

fs.writeFileSync('src/app/api/users/profile/route.ts', profileRoute, 'utf8');
console.log('[OK] Updated src/app/api/users/profile/route.ts to include all team memberships and full transfer history');
