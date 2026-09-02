import { NextRequest, NextResponse } from 'next/server';
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
    const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

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
