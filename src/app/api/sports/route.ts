import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createSportSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

async function ensureDefaultSports() {
  try {
    const teamCat = await prisma.sportCategory.upsert({
      where: { name: 'Team Sports' },
      update: {},
      create: { name: 'Team Sports', type: 'TEAM' },
    });

    const indCat = await prisma.sportCategory.upsert({
      where: { name: 'Individual & Racket Sports' },
      update: {},
      create: { name: 'Individual & Racket Sports', type: 'INDIVIDUAL' },
    });

    const defaultSports = [
      {
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
        description: 'Competitive leather and tape-ball cricket with ball-by-ball score tracking.',
      },
      {
        name: 'Football',
        slug: 'football',
        code: 'FOOTBALL',
        icon: '⚽',
        categoryId: teamCat.id,
        isTeamSport: true,
        playersPerTeam: 11,
        minPlayersRequired: 7,
        registrationType: 'TEAM',
        registrationFee: 1500.0,
        description: 'Full-pitch 90-minute and 7-a-side football tournaments.',
      },
      {
        name: 'Volleyball',
        slug: 'volleyball',
        code: 'VOLLEYBALL',
        icon: '🏐',
        categoryId: teamCat.id,
        isTeamSport: true,
        playersPerTeam: 6,
        minPlayersRequired: 6,
        registrationType: 'TEAM',
        registrationFee: 1000.0,
        description: 'Fast-paced court volleyball and shooting volleyball championships.',
      },
      {
        name: 'Badminton',
        slug: 'badminton',
        code: 'BADMINTON',
        icon: '🏸',
        categoryId: indCat.id,
        isTeamSport: false,
        playersPerTeam: 1,
        minPlayersRequired: 1,
        registrationType: 'INDIVIDUAL',
        registrationFee: 500.0,
        description: 'Official 21-point rally singles and doubles badminton tournaments.',
      },
      {
        name: 'Table Tennis',
        slug: 'table-tennis',
        code: 'TABLE_TENNIS',
        icon: '🏓',
        categoryId: indCat.id,
        isTeamSport: false,
        playersPerTeam: 1,
        minPlayersRequired: 1,
        registrationType: 'INDIVIDUAL',
        registrationFee: 500.0,
        description: 'Precision indoor table tennis singles and doubles championships.',
      },
      {
        name: 'Snooker',
        slug: 'snooker',
        code: 'SNOOKER',
        icon: '🎱',
        categoryId: indCat.id,
        isTeamSport: false,
        playersPerTeam: 1,
        minPlayersRequired: 1,
        registrationType: 'INDIVIDUAL',
        registrationFee: 800.0,
        description: 'Strategic frame-based cue sports played on standard full-size tables.',
      },
    ];

    for (const s of defaultSports) {
      const sport = await prisma.sport.upsert({
        where: { code: s.code },
        update: { isActive: true },
        create: { ...s, isActive: true },
      });

      await prisma.rankingRule.upsert({
        where: { sportId: sport.id },
        update: {},
        create: {
          sportId: sport.id,
          winPoints: 3,
          drawPoints: 1,
          lossPoints: 0,
          mvpBonusPoints: 5,
          calculationModel: s.code === 'CRICKET' ? 'CRICKET_NRR' : 'STANDARD',
        },
      });
    }
  } catch (err: any) {
    console.error('[WARN] Auto-provisioning sports notice:', err?.message || err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const sportInclude = {
      category: true,
      rankingRules: true,
      _count: {
        select: {
          teams: { where: { status: 'ACTIVE' } },
          matches: true,
        },
      },
    };

    let sports = await prisma.sport.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: sportInclude,
      orderBy: { name: 'asc' },
    });

    if (sports.length === 0) {
      await ensureDefaultSports();
      sports = await prisma.sport.findMany({
        where: includeInactive ? {} : { isActive: true },
        include: sportInclude,
        orderBy: { name: 'asc' },
      });
    }

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
