const fs = require('fs');
fs.mkdirSync('src/app/api/community/photos/[id]/action', { recursive: true });

const photoActionRoute = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdmin, isCityAdmin } from '@/lib/rbac';
import { createAuditLog } from '@/services/audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, reason } = body; // 'APPROVE' | 'REJECT' | 'REPORT' | 'DELETE'

    const photo = await prisma.matchPhoto.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const isAdmin = isSuperAdmin(auth) || auth.roles.some((r: any) => r.roleCode === 'CITY_ADMIN');
    const isUploader = photo.uploaderId === auth.userId;

    // --- ACTION 1: REPORT PHOTO (Any registered user) ---
    if (action === 'REPORT') {
      const updated = await prisma.matchPhoto.update({
        where: { id: photo.id },
        data: {
          isReported: true,
          reportReason: reason || 'Flagged for moderation by community member',
          status: 'REPORTED',
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_PHOTO_REPORTED',
        entityType: 'MatchPhoto',
        entityId: photo.id,
        changes: { reason },
      });

      return NextResponse.json({
        success: true,
        message: 'Photo reported to city sports board for moderation.',
        photo: updated,
      });
    }

    // --- ACTION 2: APPROVE PHOTO (Admin only) ---
    if (action === 'APPROVE') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin access required to approve photos.' }, { status: 403 });
      }

      const updated = await prisma.matchPhoto.update({
        where: { id: photo.id },
        data: {
          status: 'APPROVED',
          isReported: false,
          moderatedById: auth.userId,
          moderatedAt: new Date(),
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_PHOTO_APPROVED',
        entityType: 'MatchPhoto',
        entityId: photo.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Photo approved and published to community feed.',
        photo: updated,
      });
    }

    // --- ACTION 3: REJECT PHOTO (Admin only) ---
    if (action === 'REJECT') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin access required to reject photos.' }, { status: 403 });
      }

      const updated = await prisma.matchPhoto.update({
        where: { id: photo.id },
        data: {
          status: 'REJECTED',
          moderatedById: auth.userId,
          moderatedAt: new Date(),
        },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_PHOTO_REJECTED',
        entityType: 'MatchPhoto',
        entityId: photo.id,
        changes: { reason },
      });

      return NextResponse.json({
        success: true,
        message: 'Photo rejected.',
        photo: updated,
      });
    }

    // --- ACTION 4: DELETE PHOTO (Admin or original uploader) ---
    if (action === 'DELETE') {
      if (!isAdmin && !isUploader) {
        return NextResponse.json({ error: 'Forbidden: You cannot delete this photo.' }, { status: 403 });
      }

      await prisma.matchPhoto.delete({
        where: { id: photo.id },
      });

      await createAuditLog({
        userId: auth.userId,
        action: 'MATCH_PHOTO_DELETED',
        entityType: 'MatchPhoto',
        entityId: photo.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Photo deleted permanently.',
      });
    }

    return NextResponse.json({ error: 'Invalid photo action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/community/photos/[id]/action/route.ts', photoActionRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/community/photos/[id]/action/route.ts');
