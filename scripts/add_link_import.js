const fs = require('fs');

let prof = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

prof = prof.replace(
  "import React, { useEffect, useState } from 'react';",
  "import React, { useEffect, useState } from 'react';\nimport Link from 'next/link';"
);

fs.writeFileSync('src/app/profile/page.tsx', prof, 'utf8');
console.log('[OK] Added import Link from next/link in src/app/profile/page.tsx');
