const fs = require('fs');

let prof = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

prof = prof.replace(
  "import { User, MapPin, Trophy, Shield, CheckCircle2, AlertCircle, Save } from 'lucide-react';",
  "import { User, MapPin, Trophy, Shield, CheckCircle2, AlertCircle, Save, Award, ArrowRightLeft, Clock, Calendar } from 'lucide-react';"
);

fs.writeFileSync('src/app/profile/page.tsx', prof, 'utf8');
console.log('[OK] Added Award and icons to lucide-react import in src/app/profile/page.tsx');
