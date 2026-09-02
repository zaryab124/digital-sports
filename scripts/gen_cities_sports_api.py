import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote API route:', path)

# 1. Update validations for slug and ecosystem
write_file('src/lib/validations.ts', """import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  homeCityId: z.string().min(1, 'Please select your official home city'),
  initialRole: z.enum(['PLAYER', 'CAPTAIN', 'OFFICIAL', 'FAN']),
  primarySportId: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  
  jerseyNumber: z.number().int().optional(),
  playingPosition: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  officialType: z.enum(['REFEREE', 'UMPIRE', 'SCORER', 'LINE_JUDGE']).optional(),
  badgeNumber: z.string().optional(),
  experienceYears: z.number().int().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
  homeCityId: z.string().optional(),
  
  playerProfile: z.object({
    primarySportId: z.string().optional().nullable(),
    secondarySports: z.array(z.string()).optional(),
    jerseyNumber: z.number().int().optional().nullable(),
    position: z.string().optional().nullable(),
    battingStyle: z.string().optional().nullable(),
    bowlingStyle: z.string().optional().nullable(),
    dominantFoot: z.string().optional().nullable(),
    heightCm: z.number().optional().nullable(),
    weightKg: z.number().optional().nullable(),
    bio: z.string().optional().nullable(),
  }).optional(),

  captainProfile: z.object({
    experienceYears: z.number().int().optional(),
    certification: z.string().optional().nullable(),
    bio: z.string().optional().nullable(),
  }).optional(),

  officialProfile: z.object({
    officialType: z.enum(['REFEREE', 'UMPIRE', 'SCORER', 'LINE_JUDGE']).optional(),
    badgeNumber: z.string().optional().nullable(),
    licenseLevel: z.string().optional(),
    experienceYears: z.number().int().optional(),
    bio: z.string().optional().nullable(),
  }).optional(),

  fanProfile: z.object({
    favoriteCityId: z.string().optional().nullable(),
    favoriteSportId: z.string().optional().nullable(),
    cheerBio: z.string().optional().nullable(),
  }).optional(),
});

export const assignRoleSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  roleCode: z.enum([
    'SUPER_ADMIN',
    'REGIONAL_ADMIN',
    'CITY_ADMIN',
    'SPORTS_ADMIN',
    'OFFICIAL',
    'CAPTAIN',
    'PLAYER',
    'FAN',
  ]),
  regionId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  sportId: z.string().optional().nullable(),
});

export const createTeamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters'),
  code: z.string().min(2, 'Team code must be at least 2 characters').max(6),
  sportId: z.string().min(1, 'Sport selection is required'),
  cityId: z.string().min(1, 'City selection is required'),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export const createCitySchema = z.object({
  name: z.string().min(2, 'City name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  code: z.string().min(2).max(5),
  regionId: z.string().min(1, 'Region selection is required'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional().default('ACTIVE'),
});

export const updateCitySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  code: z.string().min(2).max(5).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
});

export const createSportSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  code: z.string().min(2),
  categoryId: z.string().min(1),
  icon: z.string().optional(),
  registrationType: z.enum(['TEAM', 'INDIVIDUAL', 'DUAL']).default('TEAM'),
  registrationFee: z.number().default(1000.0),
  description: z.string().optional(),
  isTeamSport: z.boolean().default(true),
  playersPerTeam: z.number().int().default(11),
  minPlayersRequired: z.number().int().default(7),
  isActive: z.boolean().optional().default(true),
});

export const updateSportSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  icon: z.string().optional().nullable(),
  registrationType: z.enum(['TEAM', 'INDIVIDUAL', 'DUAL']).optional(),
  registrationFee: z.number().optional(),
  description: z.string().optional().nullable(),
  isTeamSport: z.boolean().optional(),
  playersPerTeam: z.number().int().optional(),
  minPlayersRequired: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  postType: z.enum(['ANNOUNCEMENT', 'HIGHLIGHT', 'EVENT', 'POLL']).default('ANNOUNCEMENT'),
  isPinned: z.boolean().optional().default(false),
});

export const uploadPhotoSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  sportId: z.string().min(1),
  photoUrl: z.string().url(),
  caption: z.string().optional(),
});

export const proposeMatchSchema = z.object({
  sportId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  groundId: z.string().optional(),
  scheduledAt: z.string(),
});

export const submitPaymentSchema = z.object({
  paymentId: z.string().min(1),
  paymentMethod: z.enum(['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH']),
  transactionReference: z.string().min(2),
  proofImageUrl: z.string().url().optional(),
  remarks: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export const scoreEventSchema = z.object({
  eventType: z.string().min(1),
  teamId: z.string().min(1),
  playerId: z.string().optional(),
  minuteOrBall: z.string().optional(),
  setOrInnings: z.number().int().optional(),
  detailsJson: z.string().optional(),
});

export const transferRequestSchema = z.object({
  sportId: z.string().min(1),
  newTeamId: z.string().min(1),
  notes: z.string().optional(),
});

export const createTransferSchema = transferRequestSchema;
""")

# 2. Cities API Route (GET all, POST new)
write_file('src/app/api/cities/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
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
        grounds: { where: { isActive: true } },
        _count: {
          select: {
            teams: { where: { status: 'ACTIVE' } },
            matches: true,
            grounds: { where: { isActive: true } },
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ cities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createCitySchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const { regionId, name, code, slug, description, imageUrl, isActive, status } = validated.data;
    const generatedSlug = slug || name.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existingCode = await prisma.city.findUnique({ where: { code } });
    if (existingCode) return NextResponse.json({ error: 'A city with this code already exists' }, { status: 400 });

    const existingSlug = await prisma.city.findUnique({ where: { slug: generatedSlug } });
    if (existingSlug) return NextResponse.json({ error: 'A city with this slug already exists' }, { status: 400 });

    const city = await prisma.city.create({
      data: {
        regionId,
        name,
        slug: generatedSlug,
        code: code.toUpperCase(),
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        isActive: isActive !== undefined ? isActive : true,
        status: status || 'ACTIVE',
      },
    });

    // Automatically provision Community hub when city is active
    if (city.isActive) {
      await prisma.community.upsert({
        where: { cityId: city.id },
        update: { isActive: true },
        create: {
          cityId: city.id,
          name: `${city.name} Sports Community`,
          description: `Official digital community hub for athletes, captains, and fans in ${city.name}.`,
          bannerUrl: city.imageUrl || undefined,
          isActive: true,
        },
      });
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'CITY_CREATED',
      entityType: 'City',
      entityId: city.id,
      changes: { name, slug: generatedSlug, code },
    });

    return NextResponse.json({ city }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")

# 3. Dynamic City Single Route (GET by slug/id, PUT by slug/id)
write_file('src/app/api/cities/[citySlug]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { updateCitySchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { citySlug: string } }) {
  try {
    const { citySlug } = params;

    const city = await prisma.city.findFirst({
      where: {
        OR: [{ slug: citySlug }, { id: citySlug }],
      },
      include: {
        region: { include: { province: true } },
        community: {
          include: {
            posts: {
              include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
              orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
              take: 10,
            },
          },
        },
        grounds: { where: { isActive: true } },
        teams: {
          where: { status: 'ACTIVE' },
          include: {
            sport: true,
            captain: { select: { id: true, fullName: true } },
            _count: { select: { members: { where: { status: 'ACTIVE' } } } },
          },
        },
        matches: {
          take: 6,
          orderBy: { scheduledAt: 'desc' },
          include: {
            sport: true,
            homeTeam: true,
            awayTeam: true,
            ground: true,
          },
        },
        _count: {
          select: {
            teams: { where: { status: 'ACTIVE' } },
            matches: true,
            grounds: { where: { isActive: true } },
            users: true,
          },
        },
      },
    });

    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    // Extract unique sports played in this city
    const sportIds = Array.from(new Set(city.teams.map((t) => t.sportId)));
    const sports = await prisma.sport.findMany({
      where: { id: { in: sportIds }, isActive: true },
    });

    return NextResponse.json({ city, sports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { citySlug: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    const { citySlug } = params;
    const targetCity = await prisma.city.findFirst({
      where: { OR: [{ slug: citySlug }, { id: citySlug }] },
    });

    if (!targetCity) return NextResponse.json({ error: 'City not found' }, { status: 404 });

    const body = await req.json();
    const validated = updateCitySchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updatedCity = await prisma.city.update({
      where: { id: targetCity.id },
      data: validated.data,
    });

    // Automated Community creation/activation
    if (updatedCity.isActive) {
      await prisma.community.upsert({
        where: { cityId: updatedCity.id },
        update: { isActive: true },
        create: {
          cityId: updatedCity.id,
          name: `${updatedCity.name} Sports Community`,
          description: `Official digital community hub for athletes, captains, and fans in ${updatedCity.name}.`,
          bannerUrl: updatedCity.imageUrl || undefined,
          isActive: true,
        },
      });
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'CITY_UPDATED',
      entityType: 'City',
      entityId: updatedCity.id,
      changes: validated.data,
    });

    return NextResponse.json({ city: updatedCity });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")

# 4. Sports API Route (GET all, POST new)
write_file('src/app/api/sports/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
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
        rankingRules: true,
        _count: {
          select: {
            teams: { where: { status: 'ACTIVE' } },
            matches: true,
          },
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
    if (!auth || !isSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createSportSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const {
      name,
      slug,
      code,
      categoryId,
      icon,
      registrationType,
      registrationFee,
      description,
      isTeamSport,
      playersPerTeam,
      minPlayersRequired,
      isActive,
    } = validated.data;

    const generatedSlug = slug || name.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existingCode = await prisma.sport.findUnique({ where: { code: code.toUpperCase() } });
    if (existingCode) return NextResponse.json({ error: 'A sport with this code already exists' }, { status: 400 });

    const existingSlug = await prisma.sport.findUnique({ where: { slug: generatedSlug } });
    if (existingSlug) return NextResponse.json({ error: 'A sport with this slug already exists' }, { status: 400 });

    const sport = await prisma.sport.create({
      data: {
        name,
        slug: generatedSlug,
        code: code.toUpperCase(),
        categoryId,
        icon: icon || '🏅',
        registrationType: registrationType || 'TEAM',
        registrationFee: registrationFee || 1000.0,
        description: description || undefined,
        isTeamSport: isTeamSport !== undefined ? isTeamSport : true,
        playersPerTeam: playersPerTeam || 11,
        minPlayersRequired: minPlayersRequired || 7,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Seed default ranking rule for newly created sport
    await prisma.rankingRule.create({
      data: {
        sportId: sport.id,
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        mvpBonusPoints: 5,
        calculationModel: 'STANDARD',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'SPORT_CREATED',
      entityType: 'Sport',
      entityId: sport.id,
      changes: { name, slug: generatedSlug, code },
    });

    return NextResponse.json({ sport }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")

# 5. Sport Single Route (GET by slug/id, PUT by slug/id)
write_file('src/app/api/sports/[sportSlug]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { updateSportSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { sportSlug: string } }) {
  try {
    const { sportSlug } = params;

    const sport = await prisma.sport.findFirst({
      where: {
        OR: [{ slug: sportSlug }, { id: sportSlug }, { code: sportSlug.toUpperCase() }],
      },
      include: {
        category: true,
        rankingRules: true,
        teams: {
          where: { status: 'ACTIVE' },
          include: { city: true, captain: { select: { id: true, fullName: true } } },
          take: 12,
        },
        _count: {
          select: {
            teams: { where: { status: 'ACTIVE' } },
            matches: true,
          },
        },
      },
    });

    if (!sport) {
      return NextResponse.json({ error: 'Sport not found' }, { status: 404 });
    }

    // Fetch regional top rankings for this sport
    const rankings = await prisma.teamRanking.findMany({
      where: { sportId: sport.id },
      include: { team: { include: { city: true } } },
      orderBy: { rankPosition: 'asc' },
      take: 10,
    });

    return NextResponse.json({ sport, rankings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { sportSlug: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    const { sportSlug } = params;
    const targetSport = await prisma.sport.findFirst({
      where: { OR: [{ slug: sportSlug }, { id: sportSlug }] },
    });

    if (!targetSport) return NextResponse.json({ error: 'Sport not found' }, { status: 404 });

    const body = await req.json();
    const validated = updateSportSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updatedSport = await prisma.sport.update({
      where: { id: targetSport.id },
      data: validated.data,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'SPORT_UPDATED',
      entityType: 'Sport',
      entityId: updatedSport.id,
      changes: validated.data,
    });

    return NextResponse.json({ sport: updatedSport });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")

# 6. Compound City + Sport Route (e.g. /api/cities/[citySlug]/[sportSlug])
write_file('src/app/api/cities/[citySlug]/[sportSlug]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { citySlug: string; sportSlug: string } }
) {
  try {
    const { citySlug, sportSlug } = params;

    // 1. Resolve City
    const city = await prisma.city.findFirst({
      where: { OR: [{ slug: citySlug }, { id: citySlug }, { code: citySlug.toUpperCase() }] },
      include: { region: true },
    });
    if (!city) return NextResponse.json({ error: 'City not found' }, { status: 404 });

    // 2. Resolve Sport
    const sport = await prisma.sport.findFirst({
      where: { OR: [{ slug: sportSlug }, { id: sportSlug }, { code: sportSlug.toUpperCase() }] },
      include: { category: true, rankingRules: true },
    });
    if (!sport) return NextResponse.json({ error: 'Sport not found' }, { status: 404 });

    // 3. Fetch City-Specific Teams for this Sport
    const teams = await prisma.team.findMany({
      where: { cityId: city.id, sportId: sport.id, status: 'ACTIVE' },
      include: {
        captain: { select: { id: true, fullName: true } },
        _count: { select: { members: { where: { status: 'ACTIVE' } } } },
      },
    });

    // 4. Fetch City-Specific Grounds hosting this Sport
    const allCityGrounds = await prisma.ground.findMany({
      where: { cityId: city.id, isActive: true },
    });
    const grounds = allCityGrounds.filter((g) => {
      try {
        const supported = JSON.parse(g.sportsSupported);
        return Array.isArray(supported) && (supported.includes(sport.code) || supported.includes(sport.id));
      } catch {
        return false;
      }
    });

    // 5. Fetch City Standings for this Sport
    const standings = await prisma.teamRanking.findMany({
      where: { cityId: city.id, sportId: sport.id },
      include: { team: true },
      orderBy: { rankPosition: 'asc' },
    });

    // 6. Fetch Upcoming and Recent Matches in this City for this Sport
    const matches = await prisma.match.findMany({
      where: { cityId: city.id, sportId: sport.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        ground: true,
        scorebook: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 8,
    });

    // 7. Top Athletes / Scorers in this City for this Sport
    const topPlayers = await prisma.playerRanking.findMany({
      where: { cityId: city.id, sportId: sport.id },
      include: {
        playerProfile: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { rankPosition: 'asc' },
      take: 5,
    });

    return NextResponse.json({
      city,
      sport,
      teams,
      grounds,
      standings,
      matches,
      topPlayers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")

print('[DONE] Dynamic Cities and Sports APIs generated.')
