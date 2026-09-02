import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('✓ Wrote:', path)

# 1. Cities
write_file('src/app/api/cities/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasRole, RoleCode } from '@/lib/rbac';
import { createCitySchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const cities = await prisma.city.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        region: { include: { province: true } },
        community: true,
        _count: {
          select: {
            teams: true,
            grounds: true,
            matches: true,
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ cities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch cities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSuperAdmin(auth) && !hasRole(auth, RoleCode.REGIONAL_ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createCitySchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const { regionId, name, code, isActive } = validated.data;
    const existing = await prisma.city.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: 'City with code already exists' }, { status: 400 });

    const city = await prisma.city.create({
      data: {
        regionId,
        name,
        code,
        isActive,
        community: {
          create: {
            name: `${name} Sports Community`,
            description: `Official sports platform and tournament scorebooks for ${name}.`,
          },
        },
      },
      include: { region: true, community: true },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'CITY_CREATED',
      entityType: 'City',
      entityId: city.id,
      changes: { name, code, regionId },
    });

    return NextResponse.json({ success: true, city }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/cities/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canManageCity } from '@/lib/rbac';
import { updateCitySchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const city = await prisma.city.findUnique({
      where: { id: params.id },
      include: {
        region: { include: { province: true } },
        community: {
          include: {
            posts: {
              where: { isPublished: true },
              include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
              orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
              take: 10,
            },
          },
        },
        grounds: { where: { isActive: true } },
        teams: {
          where: { status: 'ACTIVE' },
          include: { sport: true, captain: { select: { id: true, fullName: true } } },
        },
        _count: {
          select: { teams: true, grounds: true, matches: true, users: true },
        },
      },
    });

    if (!city) return NextResponse.json({ error: 'City not found' }, { status: 404 });
    return NextResponse.json({ city });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const city = await prisma.city.findUnique({ where: { id: params.id } });
    if (!city) return NextResponse.json({ error: 'City not found' }, { status: 404 });

    if (!isSuperAdmin(auth) && !canManageCity(auth, city.id, city.regionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateCitySchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

    const updated = await prisma.city.update({
      where: { id: params.id },
      data: validated.data,
      include: { region: true, community: true },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'CITY_UPDATED',
      entityType: 'City',
      entityId: updated.id,
      changes: validated.data,
    });

    return NextResponse.json({ success: true, city: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/regions/route.ts', """import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      include: {
        province: true,
        cities: { where: { isActive: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ regions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/provinces/route.ts', """import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const provinces = await prisma.province.findMany({
      include: {
        regions: {
          include: { cities: { where: { isActive: true } } },
        },
      },
    });
    return NextResponse.json({ provinces });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 2. Sports
write_file('src/app/api/sports/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasRole, RoleCode } from '@/lib/rbac';
import { createSportSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const sports = await prisma.sport.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        category: true,
        _count: {
          select: { teams: true, matches: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ sports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSuperAdmin(auth) && !hasRole(auth, RoleCode.SPORTS_ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createSportSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const existing = await prisma.sport.findFirst({
      where: { OR: [{ code: validated.data.code }, { name: validated.data.name }] },
    });
    if (existing) return NextResponse.json({ error: 'Sport with this name or code already exists' }, { status: 400 });

    const sport = await prisma.sport.create({
      data: validated.data,
      include: { category: true },
    });

    await prisma.rankingRule.create({
      data: {
        sportId: sport.id,
        winPoints: 3,
        lossPoints: 0,
        drawPoints: 1,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'SPORT_CREATED',
      entityType: 'Sport',
      entityId: sport.id,
      changes: validated.data,
    });

    return NextResponse.json({ success: true, sport }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/sports/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canManageSport } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sport = await prisma.sport.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        rankingRules: true,
        feeConfigs: true,
        _count: { select: { teams: true, matches: true } },
      },
    });
    if (!sport) return NextResponse.json({ error: 'Sport not found' }, { status: 404 });
    return NextResponse.json({ sport });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !canManageSport(auth, params.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await prisma.sport.update({
      where: { id: params.id },
      data: body,
      include: { category: true },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'SPORT_UPDATED',
      entityType: 'Sport',
      entityId: updated.id,
      changes: body,
    });

    return NextResponse.json({ success: true, sport: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 3. Grounds
write_file('src/app/api/grounds/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canManageCity } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');

    const grounds = await prisma.ground.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        isActive: true,
      },
      include: { city: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ grounds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { cityId, name, address, sportsSupported, capacity } = body;

    if (!cityId || !name || !address) {
      return NextResponse.json({ error: 'Missing required ground fields' }, { status: 400 });
    }

    if (!canManageCity(auth, cityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ground = await prisma.ground.create({
      data: {
        cityId,
        name,
        address,
        sportsSupported: Array.isArray(sportsSupported) ? sportsSupported.join(',') : (sportsSupported || 'CRICKET,FOOTBALL'),
        capacity: capacity ? parseInt(capacity) : 500,
      },
      include: { city: true },
    });

    return NextResponse.json({ success: true, ground }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 4. Teams
write_file('src/app/api/teams/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createTeamSchema } from '@/lib/validations';
import { createPaymentOrder } from '@/services/payment-service';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    const sportId = searchParams.get('sportId');
    const status = searchParams.get('status');

    const teams = await prisma.team.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(sportId ? { sportId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        city: true,
        sport: true,
        captain: { select: { id: true, fullName: true, email: true, phone: true } },
        members: {
          where: { status: 'ACTIVE' },
          include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        teamStats: true,
        teamRankings: true,
        _count: {
          select: { members: true, homeMatches: true, awayMatches: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = createTeamSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const { cityId, sportId, name, code, logoUrl } = validated.data;

    const existing = await prisma.team.findFirst({
      where: { cityId, sportId, name },
    });
    if (existing) return NextResponse.json({ error: 'A team with this name already exists in this city for this sport' }, { status: 400 });

    // Create Team in PENDING_PAYMENT status
    const team = await prisma.team.create({
      data: {
        cityId,
        sportId,
        captainId: auth.userId,
        name,
        code,
        logoUrl,
        status: 'PENDING_PAYMENT',
        members: {
          create: [{ playerId: auth.userId, role: 'CAPTAIN', status: 'ACTIVE' }],
        },
      },
      include: { city: true, sport: true, captain: true },
    });

    // Ensure User has CAPTAIN role
    const captainRole = await prisma.role.findUnique({ where: { code: 'CAPTAIN' } });
    if (captainRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId_regionId_cityId_sportId: {
            userId: auth.userId,
            roleId: captainRole.id,
            regionId: null,
            cityId,
            sportId,
          },
        },
        update: {},
        create: {
          userId: auth.userId,
          roleId: captainRole.id,
          cityId,
          sportId,
        },
      });
    }

    // Generate Rs. 1000 Team Registration Payment Order
    const payment = await createPaymentOrder({
      userId: auth.userId,
      paymentType: 'TEAM_REGISTRATION',
      teamId: team.id,
      sportId,
      cityId,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_CREATED',
      entityType: 'Team',
      entityId: team.id,
      changes: { name, code, cityId, sportId, paymentId: payment.id },
    });

    return NextResponse.json({
      success: true,
      team,
      payment,
      message: 'Team created in PENDING_PAYMENT state. Please submit the yearly registration fee to proceed.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/teams/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canManageCity } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        city: true,
        sport: true,
        captain: { select: { id: true, fullName: true, email: true, phone: true } },
        members: {
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                playerProfile: true,
              },
            },
          },
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
        teamStats: true,
        teamRankings: true,
        homeMatches: { include: { awayTeam: true, ground: true }, orderBy: { scheduledAt: 'desc' }, take: 5 },
        awayMatches: { include: { homeTeam: true, ground: true }, orderBy: { scheduledAt: 'desc' }, take: 5 },
      },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    return NextResponse.json({ team });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCaptain = team.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || canManageCity(auth, team.cityId);

    if (!isCaptain && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const updateData: any = {};

    if (body.name) updateData.name = body.name;
    if (body.code) updateData.code = body.code;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;

    // Only admin can change status directly
    if (body.status && isAdmin) {
      updateData.status = body.status;
    }

    const updated = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_UPDATED',
      entityType: 'Team',
      entityId: updated.id,
      changes: updateData,
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/teams/[id]/members/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canManageCity } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const members = await prisma.teamMember.findMany({
      where: { teamId: params.id },
      include: {
        player: {
          select: {
            id: true,
            fullName: true,
            email: true,
            playerProfile: { include: { statistics: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id }, include: { sport: true } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isCaptain = team.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || canManageCity(auth, team.cityId);
    if (!isCaptain && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { playerId, role, jerseyNumber } = body;

    if (!playerId) return NextResponse.json({ error: 'playerId is required' }, { status: 400 });

    // Check if player is already active in another team for the same sport
    const activeElsewhere = await prisma.teamMember.findFirst({
      where: {
        playerId,
        status: 'ACTIVE',
        team: {
          sportId: team.sportId,
          id: { not: team.id },
        },
      },
      include: { team: true },
    });

    if (activeElsewhere) {
      return NextResponse.json({
        error: `Player is already actively registered with ${activeElsewhere.team.name} in this sport. An official transfer must be completed first.`,
      }, { status: 400 });
    }

    const member = await prisma.teamMember.upsert({
      where: { teamId_playerId_status: { teamId: team.id, playerId, status: 'ACTIVE' } },
      update: { role: role || 'PLAYER', jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined },
      create: {
        teamId: team.id,
        playerId,
        role: role || 'PLAYER',
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
        status: 'ACTIVE',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_MEMBER_ADDED',
      entityType: 'TeamMember',
      entityId: member.id,
      changes: { teamId: team.id, playerId, role },
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

print('✓ Routes part 1 generated successfully.')
