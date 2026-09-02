import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated photos route:', path)

write_file('src/app/api/community/[cityId]/photos/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { uploadPhotoSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const photos = await prisma.matchPhoto.findMany({
      where: { cityId: params.cityId },
      include: {
        uploader: { select: { id: true, fullName: true, avatarUrl: true } },
        match: { select: { id: true, scheduledAt: true } },
        team: { select: { id: true, name: true } },
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

    const photo = await prisma.matchPhoto.create({
      data: {
        cityId: params.cityId,
        uploaderId: auth.userId,
        ...validated.data,
      },
      include: {
        uploader: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'MATCH_PHOTO_UPLOADED',
      entityType: 'MatchPhoto',
      entityId: photo.id,
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
