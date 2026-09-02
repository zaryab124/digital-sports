const fs = require('fs');

let navbar = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');

navbar = navbar.replace(
  `import { Trophy, MapPin, User, LogOut, ChevronDown, Bell, Sparkles, CheckCircle2, Shield, Settings } from 'lucide-react';`,
  `import { Trophy, MapPin, User, LogOut, ChevronDown, Bell, Sparkles, CheckCircle2, Shield, Settings } from 'lucide-react';\nimport { NotificationBell } from '@/components/notifications/NotificationBell';`
);

navbar = navbar.replace(
  `          {/* Demo Login Trigger */}
          <button
            onClick={() => setShowRoleModal(true)}`,
  `          {/* Real-Time Notifications */}
          {user && <NotificationBell userId={user.id} />}

          {/* Demo Login Trigger */}
          <button
            onClick={() => setShowRoleModal(true)}`
);

fs.writeFileSync('src/components/layout/Navbar.tsx', navbar, 'utf8');
console.log('[OK] Integrated NotificationBell in Navbar.tsx');
