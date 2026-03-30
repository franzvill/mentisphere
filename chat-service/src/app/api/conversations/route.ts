import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const convs = await db.query.conversations.findMany({
    where: eq(conversations.mwUserId, user.id),
    orderBy: [desc(conversations.updatedAt)],
  });

  return NextResponse.json({ conversations: convs });
}
