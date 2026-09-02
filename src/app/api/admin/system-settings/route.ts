import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [fees, sports, cities, rankingRules] = await Promise.all([
      prisma.feeConfiguration.findMany({ include: { sport: true, city: true } }),
      prisma.sport.findMany({ include: { category: true } }),
      prisma.city.findMany({ include: { region: true } }),
      prisma.rankingRule.findMany({ include: { sport: true } }),
    ]);

    return NextResponse.json({
      fees,
      sports,
      cities,
      rankingRules,
      playerCategoryThresholds: {
        ELITE: 750,
        EXCELLENT: 500,
        ADVANCED: 320,
        INTERMEDIATE: 180,
        DEVELOPING: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admin required' }, { status: 403 });
    }

    const body = await req.json();
    const { settingType, payload } = body;

    if (settingType === 'FEE_CONFIG') {
      const { id, amount, isActive, description } = payload;
      const updated = await prisma.feeConfiguration.update({
        where: { id },
        data: {
          amount: parseFloat(amount),
          isActive: isActive !== undefined ? isActive : true,
          description,
        },
      });
      await createAuditLog({
        userId: auth.userId,
        action: 'SYSTEM_FEE_CONFIG_UPDATED',
        entityType: 'FeeConfiguration',
        entityId: id,
        changes: payload,
      });
      return NextResponse.json({ success: true, updated });
    }

    if (settingType === 'SPORT_CONFIG') {
      const { id, registrationFee, isTeamSport, playersPerTeam, minPlayersRequired, isActive, rulesJson } = payload;
      const updated = await prisma.sport.update({
        where: { id },
        data: {
          registrationFee: registrationFee !== undefined ? parseFloat(registrationFee) : undefined,
          isTeamSport,
          playersPerTeam: playersPerTeam ? parseInt(playersPerTeam) : undefined,
          minPlayersRequired: minPlayersRequired ? parseInt(minPlayersRequired) : undefined,
          isActive,
          rulesJson: typeof rulesJson === 'string' ? rulesJson : JSON.stringify(rulesJson),
        },
      });
      await createAuditLog({
        userId: auth.userId,
        action: 'SYSTEM_SPORT_CONFIG_UPDATED',
        entityType: 'Sport',
        entityId: id,
        changes: payload,
      });
      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: 'Invalid settingType' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
