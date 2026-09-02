const fs = require('fs');

const content = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        homeCity: { include: { region: true } },
        userRoles: { include: { role: true, city: true, sport: true } },
        playerProfile: { include: { primarySport: true, statistics: { include: { sport: true } } } },
        captainProfile: true,
        officialProfile: true,
        fanProfile: true,
        adminProfile: true,
        teamMemberships: {
          include: { team: { include: { sport: true, city: true, captain: { select: { fullName: true } } } } },
          orderBy: { joinedAt: 'desc' },
        },
        transfersAsPlayer: {
          include: {
            oldTeam: true,
            newTeam: true,
            sport: true,
            city: true,
            payment: { include: { transactions: true } },
            approvedBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
    }

    const {
      fullName,
      phone,
      cnic,
      avatarUrl,
      homeCityId,
      playerProfile,
      captainProfile,
      officialProfile,
      fanProfile,
    } = validated.data;

    // 1. Update Core User Info (CRITICAL: roles are NEVER updated from here)
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName: fullName || undefined,
        phone: phone !== undefined ? phone : undefined,
        cnic: cnic !== undefined ? cnic : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        homeCityId: homeCityId || undefined,
      },
      include: {
        homeCity: true,
        userRoles: { include: { role: true } },
      },
    });

    // 2. Update Player Profile if provided
    if (playerProfile) {
      await prisma.playerProfile.upsert({
        where: { userId: session.userId },
        update: {
          primarySportId: playerProfile.primarySportId,
          secondarySportsJson: playerProfile.secondarySports ? JSON.stringify(playerProfile.secondarySports) : undefined,
          jerseyNumber: playerProfile.jerseyNumber,
          position: playerProfile.position,
          battingStyle: playerProfile.battingStyle,
          bowlingStyle: playerProfile.bowlingStyle,
          dominantFoot: playerProfile.dominantFoot,
          heightCm: playerProfile.heightCm,
          weightKg: playerProfile.weightKg,
          bio: playerProfile.bio,
        },
        create: {
          userId: session.userId,
          primarySportId: playerProfile.primarySportId,
          secondarySportsJson: playerProfile.secondarySports ? JSON.stringify(playerProfile.secondarySports) : undefined,
          jerseyNumber: playerProfile.jerseyNumber,
          position: playerProfile.position,
          battingStyle: playerProfile.battingStyle,
          bowlingStyle: playerProfile.bowlingStyle,
          dominantFoot: playerProfile.dominantFoot,
          heightCm: playerProfile.heightCm,
          weightKg: playerProfile.weightKg,
          bio: playerProfile.bio,
        },
      });
    }

    // 3. Update Captain Profile if provided
    if (captainProfile) {
      await prisma.captainProfile.upsert({
        where: { userId: session.userId },
        update: {
          experienceYears: captainProfile.experienceYears,
          certification: captainProfile.certification,
          bio: captainProfile.bio,
        },
        create: {
          userId: session.userId,
          experienceYears: captainProfile.experienceYears || 1,
          certification: captainProfile.certification,
          bio: captainProfile.bio,
        },
      });
    }

    // 4. Update Official Profile if provided
    if (officialProfile) {
      await prisma.officialProfile.upsert({
        where: { userId: session.userId },
        update: {
          officialType: officialProfile.officialType,
          badgeNumber: officialProfile.badgeNumber,
          licenseLevel: officialProfile.licenseLevel,
          experienceYears: officialProfile.experienceYears,
          bio: officialProfile.bio,
        },
        create: {
          userId: session.userId,
          officialType: officialProfile.officialType || 'REFEREE',
          badgeNumber: officialProfile.badgeNumber,
          licenseLevel: officialProfile.licenseLevel || 'REGIONAL',
          experienceYears: officialProfile.experienceYears || 1,
          bio: officialProfile.bio,
        },
      });
    }

    // 5. Update Fan Profile if provided
    if (fanProfile) {
      await prisma.fanProfile.upsert({
        where: { userId: session.userId },
        update: {
          favoriteCityId: fanProfile.favoriteCityId,
          favoriteSportId: fanProfile.favoriteSportId,
          cheerBio: fanProfile.cheerBio,
        },
        create: {
          userId: session.userId,
          favoriteCityId: fanProfile.favoriteCityId,
          favoriteSportId: fanProfile.favoriteSportId,
          cheerBio: fanProfile.cheerBio,
        },
      });
    }

    await createAuditLog({
      userId: session.userId,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: session.userId,
      changes: { fullName, homeCityId },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/users/profile/route.ts', content.trim() + '\n', 'utf8');
console.log('[OK] Written complete src/app/api/users/profile/route.ts');
