const fs = require('fs');

let cap = fs.readFileSync('src/app/captain/page.tsx', 'utf8');

cap = cap.replace(
  'const [grounds, setGrounds] = useState<any[]>([]);',
  'const [grounds, setGrounds] = useState<any[]>([]);\n  const [teamTransfers, setTeamTransfers] = useState<any[]>([]);'
);

fs.writeFileSync('src/app/captain/page.tsx', cap, 'utf8');
console.log('[OK] Added teamTransfers state to CaptainDashboardContent in src/app/captain/page.tsx');
