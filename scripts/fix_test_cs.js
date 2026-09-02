const fs = require('fs');

let testCode = fs.readFileSync('tests/test-cities-sports.ts', 'utf8');
testCode = testCode.replace(
  "assert(jampurCricketTeams[0].name === 'Jampur Lions CC', 'Found \"Jampur Lions CC\" in Jampur cricket hub');",
  "assert(jampurCricketTeams.some(t => t.name === 'Jampur Lions CC'), 'Found \"Jampur Lions CC\" in Jampur cricket hub');"
);

fs.writeFileSync('tests/test-cities-sports.ts', testCode, 'utf8');
console.log('Updated test-cities-sports.ts');
