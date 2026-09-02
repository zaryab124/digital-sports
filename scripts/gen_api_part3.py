import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. Rankings API
write_file('src/app/api/rankings/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get('sportId');
    const cityId = searchParams.get('cityId');
    const regionId = searchParams.get('regionId');
    const type = searchParams.get('type') || 'BOTH'; // 'TEAMS' | 'PLAYERS' | 'BOTH'

    const teamRankings = (type === 'TEAMS' || type === 'BOTH') ? await prisma.teamRanking.findMany({
      where: {
        ...(sportId ? { sportId } : {}),
        ...(cityId ? { cityId } : {}),
        ...(regionId ? { regionId } : {}),
      },
      include: {
        team: { include: { city: true, sport: true, captain: { select: { fullName: true } } } },
        sport: true,
        city: true,
      },
      orderBy: [{ rankPosition: 'asc' }, { points: 'desc' }],
    }) : [];

    const playerRankings = (type === 'PLAYERS' || type === 'BOTH') ? await prisma.playerRanking.findMany({
      where: {
        ...(sportId ? { sportId } : {}),
        ...(cityId ? { cityId } : {}),
        ...(regionId ? { regionId } : {}),
      },
      include: {
        playerProfile: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true, homeCity: true } },
            statistics: true,
          },
        },
        sport: true,
        city: true,
      },
      orderBy: [{ rankPosition: 'asc' }, { points: 'desc' }],
    }) : [];

    return NextResponse.json({ teamRankings, playerRankings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 2. Payments API
write_file('src/app/api/payments/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasRole, RoleCode } from '@/lib/rbac';
import { submitPaymentSchema } from '@/lib/validations';
import { submitPaymentProof } from '@/services/payment-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');

    const isAdmin = isSuperAdmin(auth) || hasRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN]);

    const payments = await prisma.payment.findMany({
      where: {
        ...(isAdmin ? {} : { userId: auth.userId }),
        ...(status ? { status } : {}),
        ...(paymentType ? { paymentType } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        team: true,
        sport: true,
        city: true,
        transactions: { orderBy: { createdAt: 'desc' } },
        verifications: { include: { verifiedBy: { select: { fullName: true } } }, orderBy: { verifiedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = submitPaymentSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updated = await submitPaymentProof(validated.data);
    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/payments/[id]/verify/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canVerifyPayments } from '@/lib/rbac';
import { verifyPaymentSchema } from '@/lib/validations';
import { verifyPayment } from '@/services/payment-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payment = await prisma.payment.findUnique({ where: { id: params.id } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    if (!isSuperAdmin(auth) && !canVerifyPayments(auth, payment.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Admin verification privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const validated = verifyPaymentSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const updated = await verifyPayment({
      paymentId: payment.id,
      verifiedById: auth.userId,
      action: validated.data.action,
      rejectionReason: validated.data.rejectionReason,
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 3. Community Posts & Winning Photos
write_file('src/app/api/community/[cityId]/posts/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canManageCity } from '@/lib/rbac';
import { createPostSchema } from '@/lib/validations';

export async function GET(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const community = await prisma.community.findUnique({ where: { cityId: params.cityId } });
    if (!community) return NextResponse.json({ posts: [] });

    const posts = await prisma.communityPost.findMany({
      where: { communityId: community.id, isPublished: true },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ posts, community });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const community = await prisma.community.findUnique({ where: { cityId: params.cityId } });
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    const body = await req.json();
    const validated = createPostSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const post = await prisma.communityPost.create({
      data: {
        communityId: community.id,
        authorId: auth.userId,
        title: validated.data.title,
        content: validated.data.content,
        postType: validated.data.postType,
        imageUrl: validated.data.imageUrl,
        isPinned: validated.data.isPinned && canManageCity(auth, params.cityId),
        isPublished: true,
      },
      include: { author: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/community/[cityId]/photos/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canModeratePhoto } from '@/lib/rbac';
import { uploadPhotoSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const includePending = searchParams.get('includePending') === 'true';

    const photos = await prisma.matchPhoto.findMany({
      where: {
        cityId: params.cityId,
        ...(includePending ? {} : { status: 'APPROVED' }),
      },
      include: {
        team: true,
        sport: true,
        match: { include: { homeTeam: true, awayTeam: true } },
        uploader: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = uploadPhotoSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const match = await prisma.match.findUnique({
      where: { id: validated.data.matchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (!match.isLocked || !match.winnerTeamId) {
      return NextResponse.json({ error: 'Winning photos can only be uploaded after an official match result is locked.' }, { status: 400 });
    }

    const isWinnerCaptain = (match.homeTeamId === match.winnerTeamId && match.homeTeam.captainId === auth.userId) ||
                            (match.awayTeamId === match.winnerTeamId && match.awayTeam.captainId === auth.userId);

    if (!isWinnerCaptain) {
      return NextResponse.json({ error: 'Only the winning team captain can upload the official victory photo.' }, { status: 403 });
    }

    const photo = await prisma.matchPhoto.create({
      data: {
        matchId: match.id,
        teamId: match.winnerTeamId,
        cityId: match.cityId,
        sportId: match.sportId,
        uploaderId: auth.userId,
        photoUrl: validated.data.photoUrl,
        caption: validated.data.caption,
        status: 'PENDING_MODERATION',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'WINNING_PHOTO_UPLOADED',
      entityType: 'MatchPhoto',
      entityId: photo.id,
      changes: { matchId: match.id, caption: validated.data.caption },
    });

    return NextResponse.json({
      success: true,
      photo,
      message: 'Winning photo uploaded and submitted to city administrator for moderation approval.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canModeratePhoto(auth, params.cityId)) {
      return NextResponse.json({ error: 'Forbidden: City administrator access required' }, { status: 403 });
    }

    const body = await req.json();
    const { photoId, action } = body; // 'APPROVED' | 'REJECTED'

    const updated = await prisma.matchPhoto.update({
      where: { id: photoId },
      data: {
        status: action === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        moderatedById: auth.userId,
        moderatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, photo: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 4. Admin Overview, Fees & Audit Logs
write_file('src/app/api/admin/overview/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, hasRole, RoleCode } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isSuperAdmin(auth) && !hasRole(auth, [RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN, RoleCode.SPORTS_ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const totalUsers = await prisma.user.count();
    const totalCities = await prisma.city.count({ where: { isActive: true } });
    const totalSports = await prisma.sport.count({ where: { isActive: true } });
    const totalTeams = await prisma.team.count({ where: { status: 'ACTIVE' } });
    const totalMatches = await prisma.match.count();

    const pendingTeams = await prisma.team.count({ where: { status: 'PENDING_APPROVAL' } });
    const pendingTransfers = await prisma.playerTransfer.count({ where: { status: 'PENDING_APPROVAL' } });
    const pendingPayments = await prisma.payment.count({ where: { status: 'SUBMITTED' } });
    const pendingPhotos = await prisma.matchPhoto.count({ where: { status: 'PENDING_MODERATION' } });

    const recentAudits = await prisma.auditLog.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      counts: {
        totalUsers,
        totalCities,
        totalSports,
        totalTeams,
        totalMatches,
        pendingTeams,
        pendingTransfers,
        pendingPayments,
        pendingPhotos,
      },
      recentAudits,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/admin/fees/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET() {
  try {
    const fees = await prisma.feeConfiguration.findMany({
      include: { sport: true, city: true },
      orderBy: { feeType: 'asc' },
    });
    return NextResponse.json({ fees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized: Super Admin required' }, { status: 403 });

    const body = await req.json();
    const { id, amount, isActive, description } = body;

    const updated = await prisma.feeConfiguration.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        isActive: isActive !== undefined ? isActive : true,
        description,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'FEE_CONFIGURATION_UPDATED',
      entityType: 'FeeConfiguration',
      entityId: updated.id,
      changes: { amount, isActive, description },
    });

    return NextResponse.json({ success: true, fee: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/admin/audit-logs/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');

    const logs = await prisma.auditLog.findMany({
      where: entityType ? { entityType } : {},
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/admin/users/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const users = await prisma.user.findMany({
      include: {
        homeCity: true,
        userRoles: { include: { role: true, city: true, region: true, sport: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const roles = await prisma.role.findMany();

    return NextResponse.json({ users, roles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth || !isSuperAdmin(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const { userId, roleCode, cityId, regionId, sportId } = body;

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        cityId,
        regionId,
        sportId,
      },
      include: { role: true },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'USER_ROLE_ASSIGNED',
      entityType: 'UserRole',
      entityId: userRole.id,
      changes: { userId, roleCode, cityId, regionId, sportId },
    });

    return NextResponse.json({ success: true, userRole }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

print('[DONE] Routes Part 3 successfully generated.')
