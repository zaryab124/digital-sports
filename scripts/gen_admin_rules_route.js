const fs = require('fs');
fs.mkdirSync('src/app/api/admin/ranking-rules', { recursive: true });

const rulesRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const sports = await prisma.sport.findMany({
      include: { rankingRules: true },
      orderBy: { name: 'asc' },
    });

    const rules = sports.map((s) => ({
      sportId: s.id,
      sportName: s.name,
      sportCode: s.code,
      winPoints: s.rankingRules?.winPoints ?? 3,
      drawPoints: s.rankingRules?.drawPoints ?? 1,
      lossPoints: s.rankingRules?.lossPoints ?? 0,
      mvpBonusPoints: s.rankingRules?.mvpBonusPoints ?? 5,
      calculationModel: s.rankingRules?.calculationModel ?? 'STANDARD',
    }));

    return NextResponse.json({ rules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSuperAdmin(auth) && !auth.userRoles.some((r) => r.role.code === 'CITY_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required to configure ranking rules.' }, { status: 403 });
    }

    const body = await req.json();
    const { sportId, winPoints, drawPoints, lossPoints, mvpBonusPoints, calculationModel } = body;

    if (!sportId) {
      return NextResponse.json({ error: 'sportId is required' }, { status: 400 });
    }

    const updated = await prisma.rankingRule.upsert({
      where: { sportId },
      update: {
        winPoints: Number(winPoints ?? 3),
        drawPoints: Number(drawPoints ?? 1),
        lossPoints: Number(lossPoints ?? 0),
        mvpBonusPoints: Number(mvpBonusPoints ?? 5),
        calculationModel: calculationModel || 'STANDARD',
      },
      create: {
        sportId,
        winPoints: Number(winPoints ?? 3),
        drawPoints: Number(drawPoints ?? 1),
        lossPoints: Number(lossPoints ?? 0),
        mvpBonusPoints: Number(mvpBonusPoints ?? 5),
        calculationModel: calculationModel || 'STANDARD',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'RANKING_RULES_UPDATED',
      entityType: 'RankingRule',
      entityId: updated.id,
      changes: { sportId, winPoints, drawPoints, lossPoints, mvpBonusPoints },
    });

    return NextResponse.json({
      success: true,
      message: 'Sport ranking rules updated successfully.',
      rule: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/admin/ranking-rules/route.ts', rulesRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/admin/ranking-rules/route.ts');
