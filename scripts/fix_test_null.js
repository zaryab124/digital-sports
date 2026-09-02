const fs = require('fs');

let testCode = fs.readFileSync('tests/test-teams-management.ts', 'utf8');
testCode = testCode.replace(
  "assert(updatedTeamSettings.description.includes('Three-time'), 'Team settings successfully updated');",
  "assert(Boolean(updatedTeamSettings.description?.includes('Three-time')), 'Team settings successfully updated');"
);

fs.writeFileSync('tests/test-teams-management.ts', testCode, 'utf8');
console.log('Fixed optional chaining in tests/test-teams-management.ts');
