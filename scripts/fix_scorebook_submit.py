import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Fixed:', path)

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
      include: {
        scorebook: true,
        officials: true,
      },
    });

    if (!match || !match.scorebook) {
      return NextResponse.json({ error: 'Match or scorebook not found' }, { status: 404 });
    }

    const isOfficial = match.officials.some((o) => o.officialId === auth.userId);
    if (!canScoreMatch(auth, isOfficial, match.cityId)) {
      return NextResponse.json({ error: 'Forbidden: Official scoring privileges required' }, { status: 403 });
    }

    const updatedScorebook = await prisma.scorebook.update({
      where: { id: match.scorebook.id },
      data: {
        submittedById: auth.userId,
        submittedAt: new Date(),
      },
    });

    await prisma.match.update({
      where: { id: params.matchId },
      data: { status: 'COMPLETED' },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'SCOREBOOK_SUBMITTED',
      entityType: 'Scorebook',
      entityId: match.scorebook.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Scorebook submitted for admin verification.',
      scorebook: updatedScorebook,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
