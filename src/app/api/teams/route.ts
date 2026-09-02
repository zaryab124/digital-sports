import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createTeamSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

async function resolveCity(cityId: string) {
  let city = await prisma.city.findFirst({
    where: {
      OR: [
        { id: cityId },
        { code: cityId },
        { slug: cityId },
        { slug: cityId.replace('-city', '') },
        { name: { contains: cityId.replace('-city', ''), mode: 'insensitive' } },
      ],
    },
  });

  if (!city) {
    const punjab = await prisma.province.upsert({
      where: { code: 'PUNJAB' },
      update: {},
      create: { name: 'Punjab', code: 'PUNJAB' },
    });

    const southPunjab = await prisma.region.upsert({
      where: { code: 'SOUTH_PUNJAB' },
      update: {},
      create: { name: 'South Punjab', code: 'SOUTH_PUNJAB', provinceId: punjab.id },
    });

    city = await prisma.city.upsert({
      where: { code: 'JAM' },
      update: { isActive: true },
      create: {
        name: 'Jampur',
        slug: 'jampur',
        code: 'JAM',
        description: 'Historical sports hub.',
        regionId: southPunjab.id,
        status: 'ACTIVE',
        isActive: true,
      },
    });
  }

  return city;
}

async function resolveSport(sportId: string) {
  let sport = await prisma.sport.findFirst({
    where: {
      OR: [
        { id: sportId },
        { code: sportId.toUpperCase() },
        { code: sportId.replace('-sport', '').toUpperCase() },
        { slug: sportId.toLowerCase() },
        { slug: sportId.replace('-sport', '').toLowerCase() },
      ],
    },
  });

  if (!sport) {
    const teamCat = await prisma.sportCategory.upsert({
      where: { name: 'Team Sports' },
      update: {},
      create: { name: 'Team Sports', type: 'TEAM' },
    });

    sport = await prisma.sport.upsert({
      where: { code: 'CRICKET' },
      update: { isActive: true },
      create: {
        name: 'Cricket',
        slug: 'cricket',
        code: 'CRICKET',
        icon: '🏏',
        categoryId: teamCat.id,
        isTeamSport: true,
        playersPerTeam: 11,
        minPlayersRequired: 7,
        registrationType: 'TEAM',
        registrationFee: 1500.0,
        description: 'Competitive leather and tape-ball cricket.',
        isActive: true,
      },
    });
  }

  return sport;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    const sportId = searchParams.get('sportId');
    const status = searchParams.get('status');

    const where: any = {};
    if (cityId && cityId !== 'ALL') where.cityId = cityId;
    if (sportId && sportId !== 'ALL') where.sportId = sportId;
    if (status) where.status = status;

    const teams = await prisma.team.findMany({
      where,
      include: {
        city: true,
        sport: true,
        captain: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            members: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();

    // Clean optional empty strings
    if (!body.contactEmail) delete body.contactEmail;
    if (!body.contactPhone) delete body.contactPhone;
    if (!body.logoUrl) delete body.logoUrl;
    if (!body.description) delete body.description;
    if (!body.homeGroundId) delete body.homeGroundId;
    if (!body.playerRequirements) delete body.playerRequirements;

    const validated = createTeamSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { name, code, sportId: rawSportId, cityId: rawCityId, logoUrl, description, homeGroundId, contactPhone, contactEmail, playerRequirements } = validated.data;

    // Resiliently resolve Sport and City
    const sport = await resolveSport(rawSportId);
    const city = await resolveCity(rawCityId);

    const sportId = sport.id;
    const cityId = city.id;
    const feeAmount = sport.registrationFee || 1000.0;

    // Check unique team name & code within the city & sport
    const existingName = await prisma.team.findFirst({
      where: { cityId, sportId, name: name.trim() },
    });
    if (existingName) {
      return NextResponse.json(
        { error: `A team named "${name}" already exists in ${city.name} for ${sport.name}.` },
        { status: 400 }
      );
    }

    const existingCode = await prisma.team.findFirst({
      where: { cityId, sportId, code: code.toUpperCase().trim() },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: `A team with short code "${code.toUpperCase()}" already exists in ${city.name} for ${sport.name}.` },
        { status: 400 }
      );
    }

    // Create Team in DRAFT status + add Captain as founding ACTIVE member
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        sportId,
        cityId,
        captainId: auth.userId,
        logoUrl: logoUrl || undefined,
        description: description || undefined,
        homeGroundId: homeGroundId || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        playerRequirements: playerRequirements || undefined,
        status: 'DRAFT',
        members: {
          create: {
            playerId: auth.userId,
            role: 'CAPTAIN',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        city: true,
        sport: true,
      },
    });

    // Create Payment Order for Registration Fee (PKR 1,000 yearly)
    const payment = await prisma.payment.create({
      data: {
        userId: auth.userId,
        teamId: team.id,
        sportId,
        cityId,
        paymentType: 'TEAM_REGISTRATION',
        amount: feeAmount,
        currency: 'PKR',
        status: 'PENDING',
        referenceNumber: `ORD-REG-${Date.now()}`,
      },
    });

    // Assign CAPTAIN role to user if not already present
    let captainRole = await prisma.role.findUnique({ where: { code: 'CAPTAIN' } });
    if (!captainRole) {
      captainRole = await prisma.role.create({
        data: { name: 'CAPTAIN', code: 'CAPTAIN', description: 'Team Captain Role' },
      });
    }

    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: auth.userId, roleId: captainRole.id, cityId, sportId },
    });
    if (!existingUserRole) {
      await prisma.userRole.create({
        data: { userId: auth.userId, roleId: captainRole.id, cityId, sportId },
      });
    }

    await prisma.captainProfile.upsert({
      where: { userId: auth.userId },
      update: {},
      create: {
        userId: auth.userId,
        bio: `Captain of ${team.name}`,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_CREATED',
      entityType: 'Team',
      entityId: team.id,
      changes: { name, code, sportId, cityId, feeAmount },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Team draft created successfully. Please complete the registration payment.',
        team,
        payment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create team' }, { status: 500 });
  }
}
