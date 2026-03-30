import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations, chatMessages } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  if (!conv || conv.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, id),
    orderBy: [asc(chatMessages.createdAt)],
  });

  return NextResponse.json({ messages });
}
