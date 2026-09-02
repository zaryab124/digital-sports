const fs = require('fs');

const matchesRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createMatchScheduleSchema } from '@/lib/validations';
import { isCaptain, isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get('sportId');
    const sportSlug = searchParams.get('sportSlug');
    const cityId = searchParams.get('cityId');
    const citySlug = searchParams.get('citySlug');
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';
    const myMatches = searchParams.get('myMatches') === 'true';
    const date = searchParams.get('date');

    const auth = getAuthUser(req);

    const where: any = {};

    // Sport resolution
    if (sportId && sportId !== 'ALL') {
      where.sportId = sportId;
    } else if (sportSlug && sportSlug !== 'ALL') {
      const sp = await prisma.sport.findUnique({ where: { slug: sportSlug } });
      if (sp) where.sportId = sp.id;
    }

    // City resolution
    if (cityId && cityId !== 'ALL') {
      where.cityId = cityId;
    } else if (citySlug && citySlug !== 'ALL') {
      const ct = await prisma.city.findUnique({ where: { slug: citySlug } });
      if (ct) where.cityId = ct.id;
    }

    // Team Filter
    if (teamId) {
      where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }];
    }

    // Status Filter
    if (status && status !== 'ALL') {
      if (status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
    }

    // Upcoming filter (matches scheduled in future)
    if (upcoming) {
      where.status = { in: ['SCHEDULED', 'APPROVED', 'LIVE', 'PENDING_ADMIN_APPROVAL', 'ACCEPTED', 'OPPONENT_REVIEW', 'REQUESTED'] };
      where.scheduledAt = { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) }; // Include live / recent
    }

    // Date filter
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: start, lte: end };
    }

    // My Matches filter
    if (myMatches && auth) {
      const captainedTeams = await prisma.team.findMany({
        where: { captainId: auth.userId },
        select: { id: true },
      });
      const userTeamMemberships = await prisma.teamMember.findMany({
        where: { playerId: auth.userId, status: 'ACTIVE' },
        select: { teamId: true },
      });

      const allMyTeamIds = Array.from(
        new Set([...captainedTeams.map((t) => t.id), ...userTeamMemberships.map((m) => m.teamId)])
      );

      where.OR = [
        { homeTeamId: { in: allMyTeamIds } },
        { awayTeamId: { in: allMyTeamIds } },
        { requestedById: auth.userId },
      ];
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        sport: { include: { rankingRules: true } },
        city: true,
        ground: true,
        homeTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true, phone: true } },
            city: true,
          },
        },
        awayTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true, phone: true } },
            city: true,
          },
        },
        winnerTeam: true,
        adminApprovedBy: { select: { id: true, fullName: true } },
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
    const validated = createMatchScheduleSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const {
      sportId,
      cityId,
      homeTeamId,
      awayTeamId,
      groundId,
      scheduledAt,
      format,
      rules,
      notes,
      isDraft,
    } = validated.data;

    // 1. Validate distinct squads
    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: 'A squad cannot play a fixture against itself.' },
        { status: 400 }
      );
    }

    // 2. Validate squads exist, active, and sport match
    const homeTeam = await prisma.team.findUnique({
      where: { id: homeTeamId },
      include: { captain: true },
    });
    const awayTeam = await prisma.team.findUnique({
      where: { id: awayTeamId },
      include: { captain: true },
    });

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'One or both participating squads not found.' }, { status: 404 });
    }

    if (homeTeam.status !== 'ACTIVE' || awayTeam.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Both squads must hold ACTIVE registration status to schedule fixtures.' },
        { status: 400 }
      );
    }

    if (homeTeam.sportId !== sportId || awayTeam.sportId !== sportId) {
      return NextResponse.json(
        { error: 'Sport mismatch: Both squads must belong to the selected sport.' },
        { status: 400 }
      );
    }

    // 3. Authorization check
    const isHomeCaptain = homeTeam.captainId === auth.userId;
    const isAwayCaptain = awayTeam.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || isCityAdmin(auth, homeTeam.cityId);

    if (!isHomeCaptain && !isAwayCaptain && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only the squad captains or authorized administrators can schedule matches.' },
        { status: 403 }
      );
    }

    // 4. Determine initial status
    let initialStatus = isDraft ? 'DRAFT' : 'REQUESTED';
    let homeCaptainApproved = isHomeCaptain || isAdmin;
    let awayCaptainApproved = isAwayCaptain && !isHomeCaptain;

    // If admin is creating and sets directly
    if (isAdmin && !isDraft) {
      initialStatus = 'SCHEDULED';
      homeCaptainApproved = true;
      awayCaptainApproved = true;
    }

    const matchCityId = cityId || homeTeam.cityId;

    // 5. Create Match Record
    const match = await prisma.match.create({
      data: {
        sportId,
        cityId: matchCityId,
        homeTeamId,
        awayTeamId,
        groundId: groundId || undefined,
        requestedById: auth.userId,
        scheduledAt: new Date(scheduledAt),
        format: format || 'Standard Format',
        rules: rules || undefined,
        notes: notes || undefined,
        status: initialStatus,
        homeCaptainApproved,
        homeCaptainApprovedAt: homeCaptainApproved ? new Date() : undefined,
        awayCaptainApproved,
        awayCaptainApprovedAt: awayCaptainApproved ? new Date() : undefined,
        adminApproved: isAdmin,
        adminApprovedAt: isAdmin ? new Date() : undefined,
        adminApprovedById: isAdmin ? auth.userId : undefined,
        scorebook: {
          create: {
            sportId,
            currentStateJson: JSON.stringify({ status: initialStatus }),
          },
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        sport: true,
        ground: true,
        scorebook: true,
      },
    });

    // 6. Send notifications to opponent captain
    const opponentCaptainId = isHomeCaptain ? awayTeam.captainId : isAwayCaptain ? homeTeam.captainId : null;
    if (opponentCaptainId && !isDraft) {
      await prisma.notification.create({
        data: {
          userId: opponentCaptainId,
          title: 'New Match Proposal Received',
          message: \`Captain \${auth.fullName} has proposed a match: \${homeTeam.name} vs \${awayTeam.name} on \${new Date(scheduledAt).toLocaleString()}.\`,
          type: 'ACTION_REQUIRED',
        },
      });
    }

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_PROPOSED',
      entityType: 'Match',
      entityId: match.id,
      changes: {
        homeTeamId,
        awayTeamId,
        sportId,
        scheduledAt,
        status: initialStatus,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: isDraft
          ? 'Match saved as draft.'
          : 'Match fixture proposed successfully. Awaiting opponent captain review.',
        match,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/matches/route.ts', matchesRoute.trim() + '\n', 'utf8');
console.log('[OK] Written src/app/api/matches/route.ts');
