const fs = require('fs');

let submitRoute = fs.readFileSync('src/app/api/scorebook/[matchId]/submit/route.ts', 'utf8');
submitRoute = submitRoute.replace(
  `await prisma.matchPhoto.create({
        data: {
          matchId: match.id,
          teamId: match.homeTeamId,
          sportId: match.sportId,
          photoUrl: evidencePhotoUrl,
          caption: 'Official Match Result Scoresheet & Verification Evidence',
          uploadedById: auth.userId,
          status: 'APPROVED',
        },
      });`,
  `await prisma.matchPhoto.create({
        data: {
          matchId: match.id,
          teamId: match.homeTeamId,
          sportId: match.sportId,
          cityId: match.cityId,
          photoUrl: evidencePhotoUrl,
          caption: 'Official Match Result Scoresheet & Verification Evidence',
          uploaderId: auth.userId,
          status: 'APPROVED',
        },
      });`
);
fs.writeFileSync('src/app/api/scorebook/[matchId]/submit/route.ts', submitRoute, 'utf8');

let testCode = fs.readFileSync('tests/test-official-scorebook.ts', 'utf8');
testCode = testCode.replace(
  `const photoEvidence = await prisma.matchPhoto.create({
      data: {
        matchId: match.id,
        teamId: homeTeam.id,
        sportId: cricket!.id,
        photoUrl: 'https://storage.sports.pk/scoresheet-99.jpg',
        caption: 'Official Signed Scoresheet',
        uploadedById: officialUser.id,
        status: 'APPROVED',
      },
    });`,
  `const photoEvidence = await prisma.matchPhoto.create({
      data: {
        matchId: match.id,
        teamId: homeTeam.id,
        sportId: cricket!.id,
        cityId: jampur!.id,
        photoUrl: 'https://storage.sports.pk/scoresheet-99.jpg',
        caption: 'Official Signed Scoresheet',
        uploaderId: officialUser.id,
        status: 'APPROVED',
      },
    });`
);
fs.writeFileSync('tests/test-official-scorebook.ts', testCode, 'utf8');
console.log('[OK] Fixed MatchPhoto creation in submit route and test suite');
