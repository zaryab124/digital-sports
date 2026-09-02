const fs = require('fs');

let prof = fs.readFileSync('src/app/api/users/profile/route.ts', 'utf8');

const targetSection = `        teamMemberships: {
          include: { team: { include: { sport: true, city: true, captain: { select: { fullName: true } } } } },
          orderBy: { joinedAt: 'desc' },
        },
        transfersAsPlayer: {
          include: {
            oldTeam: true,
            newTeam: true,
            sport: true,
            city: true,
            payment: { include: { transactions: true } },
            approvedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
          include: { team: { include: { sport: true, city: true } } },
        },`;

const fixedSection = `        teamMemberships: {
          include: { team: { include: { sport: true, city: true, captain: { select: { fullName: true } } } } },
          orderBy: { joinedAt: 'desc' },
        },
        transfersAsPlayer: {
          include: {
            oldTeam: true,
            newTeam: true,
            sport: true,
            city: true,
            payment: { include: { transactions: true } },
            approvedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },`;

prof = prof.replace(targetSection, fixedSection);
fs.writeFileSync('src/app/api/users/profile/route.ts', prof, 'utf8');
console.log('[OK] Cleaned syntax in src/app/api/users/profile/route.ts');
