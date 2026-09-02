import { NextRequest, NextResponse } from 'next/server';
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

    const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

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
