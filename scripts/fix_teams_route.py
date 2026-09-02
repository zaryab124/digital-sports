import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/teams/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createTeamSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';
import { createPaymentOrder } from '@/services/payment-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    const sportId = searchParams.get('sportId');
    const status = searchParams.get('status');

    const where: any = {};
    if (cityId) where.cityId = cityId;
    if (sportId) where.sportId = sportId;
    if (status) where.status = status;

    const teams = await prisma.team.findMany({
      where,
      include: {
        city: true,
        sport: { include: { category: true } },
        captain: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            members: { where: { status: 'ACTIVE' } },
          },
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
    const auth = await getAuthSession();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createTeamSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const { name, code, sportId, cityId, logoUrl } = validated.data;

    // Check unique team code in city/sport
    const existing = await prisma.team.findFirst({
      where: {
        sportId,
        cityId,
        OR: [{ name }, { code }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'A team with this name or code already exists in this city and sport.' }, { status: 400 });
    }

    // Create Team in PENDING_PAYMENT status
    const team = await prisma.team.create({
      data: {
        name,
        code,
        sportId,
        cityId,
        logoUrl,
        captainId: auth.userId,
        status: 'PENDING_PAYMENT',
      },
    });

    // Add captain as active team member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        playerId: auth.userId,
        role: 'CAPTAIN',
        status: 'ACTIVE',
      },
    });

    // Assign CAPTAIN role to user if not present
    const captainRole = await prisma.role.findUnique({ where: { code: 'CAPTAIN' } });
    if (captainRole) {
      const existingRole = await prisma.userRole.findFirst({
        where: {
          userId: auth.userId,
          roleId: captainRole.id,
          sportId,
          cityId,
        },
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            userId: auth.userId,
            roleId: captainRole.id,
            cityId,
            sportId,
          },
        });
      }
    }

    // Generate Payment Order for Yearly Team Registration (PKR 1,000)
    const payment = await createPaymentOrder({
      userId: auth.userId,
      paymentType: 'TEAM_REGISTRATION',
      teamId: team.id,
      sportId,
      cityId,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TEAM_REGISTERED',
      entityType: 'Team',
      entityId: team.id,
      changes: { name, code, status: 'PENDING_PAYMENT', paymentId: payment.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Team created successfully. Please submit yearly registration fee proof to activate.',
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
""")
