import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createCitySchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

async function ensureDefaultCities() {
  try {
    let punjab = await prisma.province.findUnique({ where: { code: 'PUNJAB' } });
    if (!punjab) {
      punjab = await prisma.province.create({ data: { name: 'Punjab', code: 'PUNJAB' } });
    }

    let southPunjab = await prisma.region.findUnique({ where: { code: 'SOUTH_PUNJAB' } });
    if (!southPunjab) {
      southPunjab = await prisma.region.create({
        data: { name: 'South Punjab', code: 'SOUTH_PUNJAB', provinceId: punjab.id },
      });
    }

    const defaultCities = [
      { name: 'Jampur', slug: 'jampur', code: 'JAM', desc: 'Historical sports hub in Rajanpur district.' },
      { name: 'Dera Ghazi Khan', slug: 'dera-ghazi-khan', code: 'DGK', desc: 'Regional sports capital with premier stadiums.' },
      { name: 'Rajanpur', slug: 'rajanpur', code: 'RAJ', desc: 'Fertile district home to volleyball and badminton clubs.' },
      { name: 'Taunsa', slug: 'taunsa', code: 'TAU', desc: 'Renowned sports municipality in South Punjab.' },
      { name: 'Multan', slug: 'multan', code: 'MUL', desc: 'Divisional sports capital with international facilities.' },
      { name: 'Muzaffargarh', slug: 'muzaffargarh', code: 'MZG', desc: 'Active football, athletics, and snooker community.' },
      { name: 'Layyah', slug: 'layyah', code: 'LAY', desc: 'Thriving agricultural hub with active sports associations.' },
    ];

    for (const c of defaultCities) {
      const city = await prisma.city.upsert({
        where: { code: c.code },
        update: { isActive: true },
        create: {
          name: c.name,
          slug: c.slug,
          code: c.code,
          description: c.desc,
          regionId: southPunjab.id,
          status: 'ACTIVE',
          isActive: true,
        },
      });

      await prisma.community.upsert({
        where: { cityId: city.id },
        update: { isActive: true },
        create: {
          cityId: city.id,
          name: `${city.name} Sports Community`,
          description: `Official digital hub for ${city.name}.`,
          isActive: true,
        },
      });
    }
  } catch (err: any) {
    console.error('[WARN] Auto-provisioning cities notice:', err?.message || err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const cityInclude = {
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
    };

    let cities = await prisma.city.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: cityInclude,
      orderBy: { name: 'asc' },
    });

    if (cities.length === 0) {
      await ensureDefaultCities();
      cities = await prisma.city.findMany({
        where: includeInactive ? {} : { isActive: true },
        include: cityInclude,
        orderBy: { name: 'asc' },
      });
    }

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
