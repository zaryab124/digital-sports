const fs = require('fs');

const overviewRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN, RoleCode.SPORTS_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const [
      totalUsers,
      totalPlayers,
      totalCaptains,
      totalOfficials,
      totalTeams,
      totalCities,
      totalSports,
      upcomingMatches,
      completedMatches,
      pendingTeams,
      pendingMatches,
      pendingTransfers,
      pendingPayments,
      transferRequests,
      verifiedPaymentsSum,
      pendingPaymentsSum,
      recentAudits,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.playerProfile.count(),
      prisma.captainProfile.count(),
      prisma.officialProfile.count(),
      prisma.team.count(),
      prisma.city.count({ where: { isActive: true } }),
      prisma.sport.count({ where: { isActive: true } }),
      prisma.match.count({ where: { status: { in: ['SCHEDULED', 'APPROVED', 'LIVE'] } } }),
      prisma.match.count({ where: { status: { in: ['OFFICIAL', 'OFFICIAL_VERIFIED', 'COMPLETED'] } } }),
      prisma.team.count({ where: { status: { in: ['PENDING_APPROVAL', 'PAYMENT_SUBMITTED'] } } }),
      prisma.match.count({ where: { status: 'PENDING_ADMIN_APPROVAL' } }),
      prisma.playerTransfer.count({ where: { status: { in: ['PENDING_APPROVAL', 'PAYMENT_SUBMITTED'] } } }),
      prisma.payment.count({ where: { status: { in: ['PENDING', 'SUBMITTED'] } } }),
      prisma.playerTransfer.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'VERIFIED' },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['PENDING', 'SUBMITTED'] } },
      }),
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
      }),
    ]);

    const totalRevenue = verifiedPaymentsSum._sum.amount || 0;
    const pendingRevenue = pendingPaymentsSum._sum.amount || 0;
    const pendingApprovals = pendingTeams + pendingMatches + pendingTransfers;

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalPlayers,
        totalCaptains,
        totalOfficials,
        totalTeams,
        totalCities,
        totalSports,
        upcomingMatches,
        completedMatches,
        pendingApprovals,
        pendingTeams,
        pendingMatches,
        pendingTransfers,
        pendingPayments,
        transferRequests,
        totalRevenue,
        pendingRevenue,
      },
      recentAudits,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/admin/overview/route.ts', overviewRoute.trim() + '\n', 'utf8');
console.log('[OK] Enhanced src/app/api/admin/overview/route.ts');
