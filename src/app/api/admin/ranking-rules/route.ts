import { NextRequest, NextResponse } from 'next/server';
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

    const rules = sports.map((s) => {
      const r = s.rankingRules && s.rankingRules.length > 0 ? s.rankingRules[0] : null;
      return {
        sportId: s.id,
        sportName: s.name,
        sportCode: s.code,
        winPoints: r?.winPoints ?? 3,
        drawPoints: r?.drawPoints ?? 1,
        lossPoints: r?.lossPoints ?? 0,
        mvpBonusPoints: r?.mvpBonusPoints ?? 5,
        calculationModel: r?.calculationModel ?? 'STANDARD',
      };
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSuperAdmin(auth) && !auth.roles.some((r: any) => r.roleCode === 'CITY_ADMIN' || r.roleCode === 'SUPER_ADMIN')) {
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
