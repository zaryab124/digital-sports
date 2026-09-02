import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasAnyRole, RoleCode } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(auth) && !hasAnyRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const photos = await prisma.matchPhoto.findMany({
      include: {
        team: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        sport: { select: { id: true, name: true } },
        uploader: { select: { id: true, fullName: true, email: true } },
        match: {
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
