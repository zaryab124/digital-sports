import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createTeamSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

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
    const validated = createTeamSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { name, code, sportId, cityId, logoUrl, description, homeGroundId, contactPhone, contactEmail, playerRequirements } = validated.data;

    // Verify Sport and Registration Fee
    const sport = await prisma.sport.findUnique({ where: { id: sportId } });
    if (!sport) {
      return NextResponse.json({ error: 'Selected sport not found' }, { status: 404 });
    }

    const feeAmount = sport.registrationFee || 1000.0;

    // Check unique team name & code within the city & sport
    const existingName = await prisma.team.findFirst({
      where: { cityId, sportId, name },
    });
    if (existingName) {
      return NextResponse.json(
        { error: 'A team with this name already exists in this city for this sport.' },
        { status: 400 }
      );
    }

    const existingCode = await prisma.team.findFirst({
      where: { cityId, sportId, code: code.toUpperCase() },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: 'A team with this short code already exists in this city for this sport.' },
        { status: 400 }
      );
    }

    // Create Team in DRAFT status + add Captain as founding ACTIVE member
    const team = await prisma.team.create({
      data: {
        name,
        code: code.toUpperCase(),
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
    const captainRole = await prisma.role.findUnique({ where: { code: 'CAPTAIN' } });
    if (captainRole) {
      const existingUserRole = await prisma.userRole.findFirst({
        where: { userId: auth.userId, roleId: captainRole.id, cityId, sportId },
      });
      if (!existingUserRole) {
        await prisma.userRole.create({
          data: { userId: auth.userId, roleId: captainRole.id, cityId, sportId },
        });
      }
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
