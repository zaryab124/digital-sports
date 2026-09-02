import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/matches/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { proposeMatchSchema } from '@/lib/validations';
import { isCaptain, isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get('sportId');
    const cityId = searchParams.get('cityId');
    const status = searchParams.get('status');

    const where: any = {};
    if (sportId) where.sportId = sportId;
    if (cityId) where.cityId = cityId;
    if (status) where.status = status;

    const matches = await prisma.match.findMany({
      where,
      include: {
        sport: { include: { rankingRules: true } },
        city: true,
        ground: true,
        homeTeam: true,
        awayTeam: true,
        officials: { include: { official: { select: { id: true, fullName: true } } } },
        scorebook: true,
        photos: { where: { status: 'APPROVED' } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return NextResponse.json({ matches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = proposeMatchSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const { sportId, homeTeamId, awayTeamId, groundId, scheduledAt } = validated.data;

    const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'One or both teams not found' }, { status: 404 });
    }

    if (homeTeam.status !== 'ACTIVE' || awayTeam.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Both teams must be officially active to participate in matches' }, { status: 400 });
    }

    const authorized =
      isSuperAdmin(auth) ||
      isCityAdmin(auth, homeTeam.cityId) ||
      (isCaptain(auth) && (homeTeam.captainId === auth.userId || awayTeam.captainId === auth.userId));

    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden. You cannot propose matches for these teams.' }, { status: 403 });
    }

    const match = await prisma.match.create({
      data: {
        sportId,
        cityId: homeTeam.cityId,
        groundId: groundId || undefined,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED',
        scorebook: {
          create: {
            sportId,
            currentStateJson: JSON.stringify({ status: 'NOT_STARTED' }),
          },
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        sport: true,
        scorebook: true,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_PROPOSED',
      entityType: 'Match',
      entityId: match.id,
      changes: { homeTeamId, awayTeamId, scheduledAt },
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
