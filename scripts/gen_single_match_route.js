const fs = require('fs');

const singleMatchRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        sport: { include: { rankingRules: true } },
        city: true,
        ground: true,
        homeTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true, phone: true } },
            city: true,
            members: {
              where: { status: 'ACTIVE' },
              include: { player: { select: { id: true, fullName: true, avatarUrl: true, playerProfile: true } } },
            },
          },
        },
        awayTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true, phone: true } },
            city: true,
            members: {
              where: { status: 'ACTIVE' },
              include: { player: { select: { id: true, fullName: true, avatarUrl: true, playerProfile: true } } },
            },
          },
        },
        winnerTeam: true,
        requestedBy: { select: { id: true, fullName: true, email: true } },
        adminApprovedBy: { select: { id: true, fullName: true } },
        officials: { include: { official: { select: { id: true, fullName: true } } } },
        scorebook: true,
        scoreEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
        photos: { where: { status: 'APPROVED' } },
      },
    });

    if (!match) return NextResponse.json({ error: 'Match fixture not found' }, { status: 404 });

    const isHomeCaptain = auth ? match.homeTeam.captainId === auth.userId : false;
    const isAwayCaptain = auth ? match.awayTeam.captainId === auth.userId : false;
    const isAdmin = auth ? isSuperAdmin(auth) || isCityAdmin(auth, match.cityId) : false;
    const isOfficial = auth ? match.officials.some((o) => o.officialId === auth.userId) : false;

    return NextResponse.json({
      match,
      permissions: {
        isHomeCaptain,
        isAwayCaptain,
        isAdmin,
        isOfficial,
        canManage: isHomeCaptain || isAwayCaptain || isAdmin,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/matches/[id]/route.ts', singleMatchRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/matches/[id]/route.ts');
