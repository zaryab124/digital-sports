import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated:', path)

write_file('src/app/api/community/[cityId]/posts/route.ts', """import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createPostSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit-service';

export async function GET(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const community = await prisma.cityCommunity.findFirst({ where: { cityId: params.cityId } });
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    const posts = await prisma.communityPost.findMany({
      where: { communityId: community.id },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const community = await prisma.cityCommunity.findFirst({ where: { cityId: params.cityId } });
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    const body = await req.json();
    const validated = createPostSchema.safeParse(body);
    if (!validated.success) return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });

    const post = await prisma.communityPost.create({
      data: {
        communityId: community.id,
        authorId: auth.userId,
        ...validated.data,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: 'COMMUNITY_POST_CREATED',
      entityType: 'CommunityPost',
      entityId: post.id,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
""")
