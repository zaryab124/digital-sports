const fs = require('fs');

// 1. Fix in src/app/api/admin/transfers/route.ts
const transfersRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transfers = await prisma.playerTransfer.findMany({
      include: {
        player: { select: { id: true, fullName: true, email: true } },
        oldTeam: { select: { id: true, name: true } },
        newTeam: { select: { id: true, name: true } },
        sport: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/admin/transfers/route.ts', transfersRoute.trim() + '\n', 'utf8');

// 2. Fix in src/app/admin/page.tsx
let adminPage = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
adminPage = adminPage.replace(
  `{tr.player?.fullName}: {tr.fromTeam?.name} &rarr; {tr.toTeam?.name}</span>
                  <span className="text-slate-400 block">{tr.city?.name} &bull; {tr.sport?.name} &bull; Fee: Rs. {tr.feeAmount}</span>`,
  `{tr.player?.fullName}: {tr.oldTeam?.name} &rarr; {tr.newTeam?.name}</span>
                  <span className="text-slate-400 block">{tr.city?.name} &bull; {tr.sport?.name} &bull; Fee: Rs. {tr.fee}</span>`
);
fs.writeFileSync('src/app/admin/page.tsx', adminPage, 'utf8');

console.log('[OK] Fixed transfers route and admin page');
