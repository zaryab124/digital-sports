import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        homeCity: { include: { region: { include: { province: true } } } },
        userRoles: {
          include: {
            role: true,
            region: true,
            city: true,
            sport: true,
          },
        },
        playerProfile: { include: { primarySport: true } },
        captainProfile: true,
        officialProfile: true,
        fanProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        cnic: user.cnic,
        homeCity: user.homeCity,
        roles: user.userRoles.map((ur) => ({
          roleCode: ur.role.code,
          roleName: ur.role.name,
          region: ur.region,
          city: ur.city,
          sport: ur.sport,
        })),
        playerProfile: user.playerProfile,
        captainProfile: user.captainProfile,
        officialProfile: user.officialProfile,
        fanProfile: user.fanProfile,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch user' }, { status: 500 });
  }
}
