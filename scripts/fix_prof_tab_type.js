const fs = require('fs');

let prof = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

prof = prof.replace(
  "const [tab, setTab] = useState<'PERSONAL' | 'SPORTS' | 'ROLE_DATA'>('PERSONAL');",
  "const [tab, setTab] = useState<'PERSONAL' | 'SPORTS' | 'TRANSFERS_CLUBS' | 'ROLE_DATA'>('PERSONAL');"
);

fs.writeFileSync('src/app/profile/page.tsx', prof, 'utf8');
console.log('[OK] Updated tab state type in src/app/profile/page.tsx');
