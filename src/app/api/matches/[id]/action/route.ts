import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { matchActionSchema } from '@/lib/validations';
import { isSuperAdmin, canManageCity } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';
import { processMatchFinalStatistics } from '@/services/stats-engine';
import { sendNotification } from '@/services/notification-service';
import { publishMatchEvent } from '@/lib/realtime';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        homeTeam: { include: { captain: true } },
        awayTeam: { include: { captain: true } },
        ground: true,
        officials: true,
        scorebook: true,
      },
    });

    if (!match) return NextResponse.json({ error: 'Match fixture not found' }, { status: 404 });

    const body = await req.json();
    const validated = matchActionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { action, counterScheduledAt, counterGroundId, negotiationNotes, rejectionReason, notes } = validated.data;

    const isHomeCaptain = match.homeTeam.captainId === auth.userId;
    const isAwayCaptain = match.awayTeam.captainId === auth.userId;
    const isAdmin = isSuperAdmin(auth) || canManageCity(auth, match.cityId);
    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);

    // --- ACTION 1: ACCEPT (Opponent Captain accepts proposal) ---
    if (action === 'ACCEPT') {
      if (!isAwayCaptain && !isAdmin && !isHomeCaptain) {
        return NextResponse.json({ error: 'Forbidden: Only the participating squad captains or admins can accept this match.' }, { status: 403 });
      }

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: {
          awayCaptainApproved: true,
          awayCaptainApprovedAt: new Date(),
          status: 'PENDING_ADMIN_APPROVAL',
          notes: notes || undefined,
        },
      });

      // Notify Home Captain & City Admins
      publishMatchEvent(match.id, 'MATCH_STATUS_UPDATE', { matchId: match.id, status: 'PENDING_ADMIN_APPROVAL' });

      if (match.homeTeam.captainId) {
        await sendNotification({
          userId: match.homeTeam.captainId,
          title: 'Opponent Captain Accepted Match Proposal ⚔️',
          message: `Captain ${auth.fullName} (${match.awayTeam.name}) has accepted the match. Awaiting City Administrator approval.`,
          notificationType: 'MATCH_ACCEPTED',
          type: 'SUCCESS',
          linkUrl: `/matches/${match.id}`,
        });
      }

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_ACCEPTED',
        entityType: 'Match',
        entityId: match.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Match accepted by opponent captain. Submitted for administrative approval.',
        match: updated,
      });
    }

    // --- ACTION 2: NEGOTIATE / COUNTER-OFFER ---
    if (action === 'NEGOTIATE') {
      if (!isHomeCaptain && !isAwayCaptain && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only squad captains or admins can propose fixture amendments.' }, { status: 403 });
      }

      const newDate = counterScheduledAt ? new Date(counterScheduledAt) : match.scheduledAt;
      const newGroundId = counterGroundId !== undefined ? counterGroundId : match.groundId;

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'NEGOTIATION',
          scheduledAt: newDate,
          groundId: newGroundId || undefined,
          negotiationNotes: negotiationNotes || notes || 'Proposed amended match time/ground',
          // Re-set approvals so other captain must review
          homeCaptainApproved: isHomeCaptain,
          homeCaptainApprovedAt: isHomeCaptain ? new Date() : null,
          awayCaptainApproved: isAwayCaptain,
          awayCaptainApprovedAt: isAwayCaptain ? new Date() : null,
          adminApproved: false,
        },
      });

      const otherCaptainId = isHomeCaptain ? match.awayTeam.captainId : match.homeTeam.captainId;
      if (otherCaptainId) {
        await prisma.notification.create({
          data: {
            userId: otherCaptainId,
            title: 'Fixture Amendment Proposed',
            message: `Captain ${auth.fullName} has proposed updated terms/time for ${match.homeTeam.name} vs ${match.awayTeam.name}.`,
            type: 'ACTION_REQUIRED',
          },
        });
      }

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_NEGOTIATION_PROPOSED',
        entityType: 'Match',
        entityId: match.id,
        changes: { scheduledAt: newDate, groundId: newGroundId, negotiationNotes },
      });

      return NextResponse.json({
        success: true,
        message: 'Counter-proposal submitted. Opponent captain notified.',
        match: updated,
      });
    }

    // --- ACTION 3: ADMIN APPROVAL ---
    if (action === 'ADMIN_APPROVE') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: City or Super Admin authorization required for match sanctioning.' }, { status: 403 });
      }

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'SCHEDULED',
          adminApproved: true,
          adminApprovedAt: new Date(),
          adminApprovedById: auth.userId,
          homeCaptainApproved: true,
          awayCaptainApproved: true,
        },
      });

      // Auto-provision or activate scorebook
      await prisma.scorebook.upsert({
        where: { matchId: match.id },
        update: {
          currentStateJson: JSON.stringify({ status: 'SCHEDULED' }),
        },
        create: {
          matchId: match.id,
          sportId: match.sportId,
          currentStateJson: JSON.stringify({ status: 'SCHEDULED' }),
        },
      });

      // Notify both captains
      const captainIds = [match.homeTeam.captainId, match.awayTeam.captainId].filter(Boolean) as string[];
      for (const capId of captainIds) {
        await prisma.notification.create({
          data: {
            userId: capId,
            title: 'Match Officially Approved & Scheduled',
            message: `The fixture ${match.homeTeam.name} vs ${match.awayTeam.name} has been officially approved for ${new Date(match.scheduledAt).toLocaleString()}.`,
            type: 'SUCCESS',
          },
        });
      }

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_ADMIN_APPROVED',
        entityType: 'Match',
        entityId: match.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Match fixture officially approved and scheduled.',
        match: updated,
      });
    }

    // --- ACTION 4: START LIVE MATCH ---
    if (action === 'START_LIVE') {
      if (!isHomeCaptain && !isAwayCaptain && !isAdmin && !isOfficial) {
        return NextResponse.json({ error: 'Forbidden: Only authorized match officials or captains can start live play.' }, { status: 403 });
      }

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'LIVE',
        },
      });

      if (match.scorebook) {
        await prisma.scorebook.update({
          where: { matchId: match.id },
          data: { currentStateJson: JSON.stringify({ status: 'LIVE', liveStartedAt: new Date() }) },
        });
      }

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_STARTED_LIVE',
        entityType: 'Match',
        entityId: match.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Match is now LIVE. Digital scorebook active.',
        match: updated,
      });
    }

    // --- ACTION 5: COMPLETE MATCH / SUBMIT RESULT ---
    if (action === 'COMPLETE_MATCH') {
      if (!isHomeCaptain && !isAwayCaptain && !isAdmin && !isOfficial) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'RESULT_PENDING_VERIFICATION',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Match marked as completed. Awaiting official verification.',
        match: updated,
      });
    }

    // --- ACTION 6: LOCK MATCH & FINALIZE RANKINGS ---
    if (action === 'LOCK_MATCH' || action === 'VERIFY_RESULT') {
      if (!isAdmin && !isOfficial) {
        return NextResponse.json({ error: 'Forbidden: Official Scorer or Administrator verification required to lock match.' }, { status: 403 });
      }

      // Process match statistics and rankings update
      const statsResult = await processMatchFinalStatistics(match.id);

      const updated = await prisma.match.findUnique({
        where: { id: match.id },
        include: { scorebook: true, homeTeam: true, awayTeam: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Match locked and verified. Player stats and municipal rankings updated.',
        match: updated,
        statsResult,
      });
    }

    // --- ACTION 7: CANCEL / REJECT ---
    if (action === 'CANCEL' || action === 'ADMIN_REJECT') {
      if (!isHomeCaptain && !isAwayCaptain && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'CANCELLED',
          notes: rejectionReason || notes || 'Match fixture cancelled.',
        },
      });

      const captainIds = [match.homeTeam.captainId, match.awayTeam.captainId].filter(Boolean) as string[];
      for (const capId of captainIds) {
        await prisma.notification.create({
          data: {
            userId: capId,
            title: 'Match Fixture Cancelled',
            message: `Fixture ${match.homeTeam.name} vs ${match.awayTeam.name} was cancelled: ${rejectionReason || 'No reason specified'}.`,
            type: 'WARNING',
          },
        });
      }

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_CANCELLED',
        entityType: 'Match',
        entityId: match.id,
        changes: { rejectionReason },
      });

      return NextResponse.json({
        success: true,
        message: 'Match fixture has been cancelled.',
        match: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid match action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
