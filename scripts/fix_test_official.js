const fs = require('fs');

let testCode = fs.readFileSync('tests/test-official-scorebook.ts', 'utf8');
testCode = testCode.replace(
  `officialProfile: {
          create: {
            certifications: 'PCB Level 3 / ICC Certified',
            experienceYears: 12,
            licenseNumber: 'OFF-JAM-2026-99',
          },
        },`,
  `officialProfile: {
          create: {
            licenseLevel: 'PCB Level 3 / ICC Certified',
            experienceYears: 12,
            badgeNumber: 'OFF-JAM-2026-99',
            officialType: 'UMPIRE',
            isVerifiedByAdmin: true,
          },
        },`
);

fs.writeFileSync('tests/test-official-scorebook.ts', testCode, 'utf8');
console.log('[OK] Fixed officialProfile creation in test');
