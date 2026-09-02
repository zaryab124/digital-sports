import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. Team Invitations & Requests
write_file('src/app/api/teams/[id]/invitations/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId: params.id },
      include: {
        player: { select: { id: true, fullName: true, email: true } },
        invitedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ invitations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    if (team.captainId !== auth.userId) return NextResponse.json({ error: 'Only captain can invite players' }, { status: 403 });

    const body = await req.json();
    const { playerId, message } = body;
    if (!playerId) return NextResponse.json({ error: 'playerId is required' }, { status: 400 });

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: team.id,
        playerId,
        invitedById: auth.userId,
        message,
        status: 'PENDING',
      },
    });

    await prisma.notification.create({
      data: {
        userId: playerId,
        title: 'Team Invitation',
        message: `You have been invited to join ${team.name}.`,
        link: `/teams/${team.id}`,
      },
    });

    return NextResponse.json({ success: true, invitation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/teams/[id]/requests/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requests = await prisma.teamRequest.findMany({
      where: { teamId: params.id },
      include: {
        player: { select: { id: true, fullName: true, email: true, playerProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const body = await req.json();
    const { message } = body;

    const request = await prisma.teamRequest.create({
      data: {
        teamId: team.id,
        playerId: auth.userId,
        message,
        status: 'PENDING',
      },
    });

    await prisma.notification.create({
      data: {
        userId: team.captainId,
        title: 'Team Join Request',
        message: `${auth.fullName} has requested to join ${team.name}.`,
        link: `/teams/${team.id}`,
      },
    });

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 2. Player Transfers
write_file('src/app/api/transfers/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createTransferSchema } from '@/lib/validations';
import { createPaymentOrder } from '@/services/payment-service';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');
    const sportId = searchParams.get('sportId');
    const cityId = searchParams.get('cityId');
    const status = searchParams.get('status');

    const transfers = await prisma.playerTransfer.findMany({
      where: {
        ...(playerId ? { playerId } : {}),
        ...(sportId ? { sportId } : {}),
        ...(cityId ? { cityId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        player: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        sport: true,
        city: true,
        oldTeam: true,
        newTeam: true,
        payment: true,
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = createTransferSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const { sportId, newTeamId, notes } = validated.data;

    // Find current active team of this player in this sport
    const currentMembership = await prisma.teamMember.findFirst({
      where: {
        playerId: auth.userId,
        status: 'ACTIVE',
        team: { sportId },
      },
      include: { team: true },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'You do not have an active team in this sport to transfer from.' }, { status: 400 });
    }

    if (currentMembership.teamId === newTeamId) {
      return NextResponse.json({ error: 'You are already in this team.' }, { status: 400 });
    }

    const newTeam = await prisma.team.findUnique({ where: { id: newTeamId } });
    if (!newTeam) return NextResponse.json({ error: 'Target team does not exist.' }, { status: 404 });

    // Create Transfer Record
    const transfer = await prisma.playerTransfer.create({
      data: {
        playerId: auth.userId,
        sportId,
        cityId: newTeam.cityId,
        oldTeamId: currentMembership.teamId,
        newTeamId: newTeam.id,
        status: 'PENDING_PAYMENT',
        fee: 100.0,
        notes,
      },
      include: { oldTeam: true, newTeam: true },
    });

    // Create Transfer Payment Order (Rs. 100)
    const payment = await createPaymentOrder({
      userId: auth.userId,
      paymentType: 'PLAYER_TRANSFER',
      amount: 100.0,
      sportId,
      cityId: newTeam.cityId,
    });

    await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: { paymentId: payment.id },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TRANSFER_REQUESTED',
      entityType: 'PlayerTransfer',
      entityId: transfer.id,
      changes: { oldTeam: currentMembership.team.name, newTeam: newTeam.name, fee: 100 },
    });

    return NextResponse.json({
      success: true,
      transfer,
      payment,
      message: 'Transfer request submitted. Please pay Rs. 100 transfer fee to proceed to approvals.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/transfers/[id]/approve/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canApproveTransfers } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transfer = await prisma.playerTransfer.findUnique({
      where: { id: params.id },
      include: { oldTeam: true, newTeam: true, payment: true },
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });

    const body = await req.json();
    const { action, reason } = body; // 'APPROVE' | 'REJECT'

    const isOldCaptain = transfer.oldTeam.captainId === auth.userId;
    const isNewCaptain = transfer.newTeam.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || canApproveTransfers(auth, transfer.cityId);

    if (!isOldCaptain && !isNewCaptain && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'REJECT') {
      const updated = await prisma.playerTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'REJECTED',
          notes: reason ? `${transfer.notes || ''} [Rejected: ${reason}]` : transfer.notes,
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'TRANSFER_REJECTED',
        entityType: 'PlayerTransfer',
        entityId: transfer.id,
        changes: { reason },
      });

      return NextResponse.json({ success: true, transfer: updated });
    }

    // Process Complete Transfer Atomically
    // 1. Mark old team membership as FORMER (never delete historical membership)
    await prisma.teamMember.updateMany({
      where: {
        teamId: transfer.oldTeamId,
        playerId: transfer.playerId,
        status: 'ACTIVE',
      },
      data: {
        status: 'FORMER',
        leftAt: new Date(),
      },
    });

    // 2. Add new team membership as ACTIVE
    await prisma.teamMember.create({
      data: {
        teamId: transfer.newTeamId,
        playerId: transfer.playerId,
        role: 'PLAYER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    // 3. Update Transfer record as COMPLETED
    const completed = await prisma.playerTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'COMPLETED',
        approvedById: auth.userId,
        approvedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 4. Notify Player
    await prisma.notification.create({
      data: {
        userId: transfer.playerId,
        title: 'Transfer Completed',
        message: `Your transfer from ${transfer.oldTeam.name} to ${transfer.newTeam.name} has been completed!`,
        type: 'SUCCESS',
        link: `/teams/${transfer.newTeamId}`,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'TRANSFER_COMPLETED',
      entityType: 'PlayerTransfer',
      entityId: transfer.id,
      changes: { oldTeamId: transfer.oldTeamId, newTeamId: transfer.newTeamId },
    });

    return NextResponse.json({ success: true, transfer: completed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 3. Matches
write_file('src/app/api/matches/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { proposeMatchSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    const sportId = searchParams.get('sportId');
    const status = searchParams.get('status');
    const teamId = searchParams.get('teamId');

    const matches = await prisma.match.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(sportId ? { sportId } : {}),
        ...(status ? { status } : {}),
        ...(teamId ? { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] } : {}),
      },
      include: {
        city: true,
        sport: true,
        ground: true,
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true,
        officials: { include: { official: { select: { id: true, fullName: true } } } },
        scorebook: true,
        rules: true,
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
    const validated = proposeMatchSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const { sportId, homeTeamId, awayTeamId, groundId, scheduledAt, rulesJson } = validated.data;

    const homeTeam = await prisma.team.findUnique({ where: { id: homeTeamId } });
    const awayTeam = await prisma.team.findUnique({ where: { id: awayTeamId } });

    if (!homeTeam || !awayTeam) return NextResponse.json({ error: 'One or both teams not found' }, { status: 404 });
    if (homeTeam.captainId !== auth.userId && awayTeam.captainId !== auth.userId) {
      return NextResponse.json({ error: 'Only team captains can propose a match' }, { status: 403 });
    }

    const match = await prisma.match.create({
      data: {
        cityId: homeTeam.cityId,
        sportId,
        groundId,
        homeTeamId,
        awayTeamId,
        requestedById: auth.userId,
        scheduledAt: new Date(scheduledAt),
        status: 'REQUESTED',
        rulesJson,
        rules: {
          create: {
            customRulesJson: rulesJson,
          },
        },
      },
      include: { homeTeam: true, awayTeam: true, ground: true, sport: true },
    });

    // Notify Opponent Captain
    const opponentCaptainId = homeTeam.captainId === auth.userId ? awayTeam.captainId : homeTeam.captainId;
    await prisma.notification.create({
      data: {
        userId: opponentCaptainId,
        title: 'New Match Proposal',
        message: `${homeTeam.name} has challenged ${awayTeam.name} for a match on ${new Date(scheduledAt).toLocaleDateString()}.`,
        link: `/matches/${match.id}`,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_PROPOSED',
      entityType: 'Match',
      entityId: match.id,
      changes: { homeTeamId, awayTeamId, scheduledAt },
    });

    return NextResponse.json({ success: true, match }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/matches/[id]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        city: true,
        sport: true,
        ground: true,
        homeTeam: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } } },
        awayTeam: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } } },
        winnerTeam: true,
        requestedBy: { select: { id: true, fullName: true } },
        lockedBy: { select: { id: true, fullName: true } },
        participants: { include: { player: true } },
        officials: { include: { official: true } },
        rules: true,
        scorebook: { include: { events: { orderBy: { createdAt: 'asc' } } } },
        playerStats: { include: { match: true } },
        teamStats: true,
        photos: true,
      },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    return NextResponse.json({ match });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/matches/[id]/action/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, canManageCity } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const body = await req.json();
    const { action, scheduledAt, groundId, rulesJson } = body;
    // Actions: 'ACCEPT' | 'PROPOSE_AMENDMENT' | 'ADMIN_APPROVE' | 'CANCEL'

    const isHomeCaptain = match.homeTeam.captainId === auth.userId;
    const isAwayCaptain = match.awayTeam.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || canManageCity(auth, match.cityId);

    let nextStatus = match.status;

    if (action === 'ACCEPT') {
      if (!isHomeCaptain && !isAwayCaptain) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      nextStatus = 'PENDING_ADMIN_APPROVAL';
    } else if (action === 'PROPOSE_AMENDMENT') {
      if (!isHomeCaptain && !isAwayCaptain) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      nextStatus = 'AMENDMENT_PROPOSED';
    } else if (action === 'ADMIN_APPROVE') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin permission required to schedule match' }, { status: 403 });
      nextStatus = 'SCHEDULED';
      
      // Auto create scorebook for this match
      await prisma.scorebook.upsert({
        where: { matchId: match.id },
        update: {},
        create: {
          matchId: match.id,
          sportId: match.sportId,
          currentStateJson: JSON.stringify({ status: 'SCHEDULED' }),
        },
      });
    } else if (action === 'CANCEL') {
      if (!isHomeCaptain && !isAwayCaptain && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      nextStatus = 'CANCELLED';
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: nextStatus,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(groundId ? { groundId } : {}),
        ...(rulesJson ? { rulesJson } : {}),
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: `MATCH_${action}`,
      entityType: 'Match',
      entityId: match.id,
      changes: { action, status: nextStatus },
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

# 4. Scorebook & Events
write_file('src/app/api/scorebook/[matchId]/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const scorebook = await prisma.scorebook.findUnique({
      where: { matchId: params.matchId },
      include: {
        match: {
          include: {
            homeTeam: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } } },
            awayTeam: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } } },
            sport: true,
            ground: true,
            officials: { include: { official: true } },
          },
        },
        events: { orderBy: { createdAt: 'asc' } },
        submittedBy: { select: { id: true, fullName: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!scorebook) return NextResponse.json({ error: 'Scorebook not found' }, { status: 404 });
    return NextResponse.json({ scorebook });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/scorebook/[matchId]/events/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canScoreMatch } from '@/lib/rbac';
import { scoreEventSchema } from '@/lib/validations';
import { calculateScorebookState } from '@/services/scorebook-engine';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: { officials: true, sport: true, scorebook: true },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'This match is official and locked from further scoring edits.' }, { status: 400 });

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Assigned official or administrator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = scoreEventSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    // Ensure Scorebook exists
    const scorebook = await prisma.scorebook.upsert({
      where: { matchId: match.id },
      update: {},
      create: {
        matchId: match.id,
        sportId: match.sportId,
      },
    });

    // Create Score Event
    const event = await prisma.scoreEvent.create({
      data: {
        scorebookId: scorebook.id,
        matchId: match.id,
        eventType: validated.data.eventType,
        teamId: validated.data.teamId,
        playerId: validated.data.playerId,
        minuteOrBall: validated.data.minuteOrBall,
        setOrInnings: validated.data.setOrInnings,
        detailsJson: validated.data.detailsJson,
      },
    });

    // Ensure Match Participant is registered
    if (validated.data.playerId) {
      await prisma.matchParticipant.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId: validated.data.playerId } },
        update: {},
        create: {
          matchId: match.id,
          teamId: validated.data.teamId,
          playerId: validated.data.playerId,
        },
      });
    }

    // Recalculate Live Scorebook State
    const allEvents = await prisma.scoreEvent.findMany({ where: { scorebookId: scorebook.id } });
    const state = calculateScorebookState(match.sport.code, match.homeTeamId, match.awayTeamId, allEvents);

    await prisma.scorebook.update({
      where: { id: scorebook.id },
      data: {
        currentStateJson: JSON.stringify(state),
      },
    });

    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'IN_PROGRESS',
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        winnerTeamId: state.winnerTeamId,
      },
    });

    return NextResponse.json({ success: true, event, state }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/scorebook/[matchId]/submit/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canScoreMatch } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: { officials: true, scorebook: true },
    });

    if (!match || !match.scorebook) return NextResponse.json({ error: 'Match or Scorebook not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'Match is already locked' }, { status: 400 });

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.scorebook.update({
      where: { id: match.scorebook.id },
      data: {
        isFinal: true,
        submittedById: auth.userId,
        submittedAt: new Date(),
      },
    });

    const updatedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'RESULT_SUBMITTED',
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'SCOREBOOK_RESULT_SUBMITTED',
      entityType: 'Match',
      entityId: match.id,
    });

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

write_file('src/app/api/scorebook/[matchId]/verify/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canVerifyMatchResult } from '@/lib/rbac';
import { processMatchFinalStatistics } from '@/services/stats-engine';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: { scorebook: true },
    });

    if (!match || !match.scorebook) return NextResponse.json({ error: 'Match or scorebook not found' }, { status: 404 });
    if (match.isLocked) return NextResponse.json({ error: 'Match is already locked as official result.' }, { status: 400 });

    if (!canVerifyMatchResult(auth, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: City or Super Admin authorization required to verify official result.' }, { status: 403 });
    }

    // Process Full Match Statistics, Recalculate Player & Team Stats, Leaderboards, Rankings & Lock Match
    const result = await processMatchFinalStatistics(match.id);

    await prisma.scorebook.update({
      where: { id: match.scorebook.id },
      data: {
        verifiedById: auth.userId,
        verifiedAt: new Date(),
      },
    });

    await prisma.match.update({
      where: { id: match.id },
      data: {
        lockedById: auth.userId,
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_OFFICIALLY_LOCKED',
      entityType: 'Match',
      entityId: match.id,
      changes: { mvpPlayerId: result.mvpPlayerId, scores: result.calculated },
    });

    return NextResponse.json({
      success: true,
      message: 'Match result officially verified and locked. Stats, ratings, and rankings updated!',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}""")

print('[DONE] Routes Part 2 successfully generated.')
