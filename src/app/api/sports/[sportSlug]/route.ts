import { NextRequest, NextResponse } from 'next/server';
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
