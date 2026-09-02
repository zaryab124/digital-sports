import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

write_file('src/app/api/cities/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { updateCitySchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const city = await prisma.city.findUnique({
      where: { id: params.id },
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

    return NextResponse.json({ city });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden. Super Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateCitySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const city = await prisma.city.update({
      where: { id: params.id },
      data: validated.data,
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'CITY_UPDATED',
      entityType: 'City',
      entityId: city.id,
      changes: validated.data,
    });

    return NextResponse.json({ city });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
