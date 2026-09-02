const fs = require('fs');

fs.mkdirSync('src/app/api/admin/teams', { recursive: true });
fs.mkdirSync('src/app/api/admin/matches', { recursive: true });
fs.mkdirSync('src/app/api/admin/transfers', { recursive: true });
fs.mkdirSync('src/app/api/admin/photos', { recursive: true });
fs.mkdirSync('src/app/api/admin/notifications', { recursive: true });
fs.mkdirSync('src/app/api/admin/system-settings', { recursive: true });

// 1. Admin Teams API
const teamsRoute = `import { NextRequest, NextResponse } from 'next/server';
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const cityId = searchParams.get('cityId');

    const where: any = {};
    if (status) where.status = status;
    if (cityId) where.cityId = cityId;

    const teams = await prisma.team.findMany({
      where,
      include: {
        city: true,
        sport: true,
        captain: { select: { id: true, fullName: true, email: true, phone: true } },
        members: { include: { player: { select: { fullName: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, action, reason } = body; // action: 'APPROVE' | 'REJECT' | 'SUSPEND'

    const targetStatus = action === 'APPROVE' ? 'ACTIVE' : action === 'REJECT' ? 'REJECTED' : 'INACTIVE';

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        status: targetStatus,
        isActive: targetStatus === 'ACTIVE',
        approvedById: action === 'APPROVE' ? auth.userId : undefined,
        approvedAt: action === 'APPROVE' ? new Date() : undefined,
        rejectionReason: action === 'REJECT' ? reason : undefined,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_STATUS_ADMIN_UPDATED',
      entityType: 'Team',
      entityId: teamId,
      changes: { status: targetStatus, reason },
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/admin/teams/route.ts', teamsRoute.trim() + '\n', 'utf8');

// 2. Admin Matches API
const matchesRoute = `import { NextRequest, NextResponse } from 'next/server';
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

    const matches = await prisma.match.findMany({
      include: {
        city: true,
        sport: true,
        ground: true,
        homeTeam: { select: { id: true, name: true, code: true } },
        awayTeam: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ matches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { matchId, action, reason } = body; // 'APPROVE' | 'REJECT' | 'LOCK' | 'UNLOCK'

    let updateData: any = {};
    if (action === 'APPROVE') {
      updateData = {
        status: 'SCHEDULED',
        adminApproved: true,
        adminApprovedById: auth.userId,
        adminApprovedAt: new Date(),
      };
    } else if (action === 'REJECT') {
      updateData = {
        status: 'CANCELLED',
        adminApproved: false,
        notes: reason || 'Match rejected by administrator',
      };
    } else if (action === 'LOCK') {
      updateData = { isLocked: true, status: 'OFFICIAL' };
    } else if (action === 'UNLOCK') {
      updateData = { isLocked: false };
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_ADMIN_UPDATED',
      entityType: 'Match',
      entityId: matchId,
      changes: { action, ...updateData },
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/admin/matches/route.ts', matchesRoute.trim() + '\n', 'utf8');

// 3. Admin Transfers API
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
        fromTeam: { select: { id: true, name: true } },
        toTeam: { select: { id: true, name: true } },
        sport: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        payments: true,
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

// 4. Admin Photos Moderation API
const photosRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const photos = await prisma.matchPhoto.findMany({
      include: {
        team: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        sport: { select: { id: true, name: true } },
        uploader: { select: { id: true, fullName: true, email: true } },
        match: {
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/admin/photos/route.ts', photosRoute.trim() + '\n', 'utf8');

// 5. Admin Notifications Broadcast API
const notificationsRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, targetCityId, targetRole } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const where: any = {};
    if (targetCityId) where.homeCityId = targetCityId;

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    const notificationsData = users.map((u) => ({
      userId: u.id,
      title,
      message,
      type: type || 'INFO',
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'BROADCAST_NOTIFICATION_SENT',
      entityType: 'Notification',
      entityId: 'SYSTEM_BROADCAST',
      changes: { title, count: users.length, targetCityId, targetRole },
    });

    return NextResponse.json({
      success: true,
      message: \`Broadcast delivered to \${users.length} users successfully.\`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/admin/notifications/route.ts', notificationsRoute.trim() + '\n', 'utf8');

// 6. Admin System Settings API (Configurable Business Rules)
const settingsRoute = `import { NextRequest, NextResponse } from 'next/server';
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
`;
fs.writeFileSync('src/app/api/admin/system-settings/route.ts', settingsRoute.trim() + '\n', 'utf8');

console.log('[OK] Generated all Super Admin API routes');
