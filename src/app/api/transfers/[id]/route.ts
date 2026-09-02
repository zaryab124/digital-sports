import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transfer = await prisma.playerTransfer.findUnique({
      where: { id: params.id },
      include: {
        player: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            playerProfile: true,
          },
        },
        oldTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true } },
            city: true,
          },
        },
        newTeam: {
          include: {
            captain: { select: { id: true, fullName: true, email: true } },
            city: true,
          },
        },
        sport: true,
        city: true,
        payment: {
          include: {
            transactions: { orderBy: { createdAt: 'desc' } },
            verifications: true,
          },
        },
        requester: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer record not found' }, { status: 404 });

    return NextResponse.json({ transfer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
