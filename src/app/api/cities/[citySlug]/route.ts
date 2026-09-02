import { NextRequest, NextResponse } from 'next/server';
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
