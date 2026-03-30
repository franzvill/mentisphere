import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages, chatSessions, agentStats } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const rateSchema = z.object({
  rating: z.enum(['helpful', 'not_helpful']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;

  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  if (!message.sessionId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, message.sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const previousRating = message.rating;
  await db.update(chatMessages)
    .set({ rating: parsed.data.rating })
    .where(eq(chatMessages.id, messageId));

  if (previousRating === null) {
    await db.update(agentStats)
      .set({
        [parsed.data.rating === 'helpful' ? 'helpfulCount' : 'notHelpfulCount']:
          sql`${parsed.data.rating === 'helpful' ? agentStats.helpfulCount : agentStats.notHelpfulCount} + 1`,
      })
      .where(eq(agentStats.agentPageTitle, session.agentPageTitle));
  } else if (previousRating !== parsed.data.rating) {
    await db.update(agentStats)
      .set({
        helpfulCount: parsed.data.rating === 'helpful'
          ? sql`${agentStats.helpfulCount} + 1`
          : sql`${agentStats.helpfulCount} - 1`,
        notHelpfulCount: parsed.data.rating === 'not_helpful'
          ? sql`${agentStats.notHelpfulCount} + 1`
          : sql`${agentStats.notHelpfulCount} - 1`,
      })
      .where(eq(agentStats.agentPageTitle, session.agentPageTitle));
  }

  return NextResponse.json({ success: true });
}
