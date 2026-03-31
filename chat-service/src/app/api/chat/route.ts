import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations, chatMessages } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { createChatGraph } from '@/graph';
import { eq, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  agent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Get or create conversation
  let conversationId = parsed.data.conversationId;
  let previousAgent: string | null = null;

  if (conversationId) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    if (!conv || conv.mwUserId !== user.id) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    // Get last agent used in this conversation
    const lastMsg = await db.query.chatMessages.findFirst({
      where: eq(chatMessages.conversationId, conversationId),
      orderBy: [desc(chatMessages.createdAt)],
    });
    previousAgent = lastMsg?.agentPageTitle || null;
  } else {
    // Create new conversation
    const title = parsed.data.message.substring(0, 50) + (parsed.data.message.length > 50 ? '...' : '');
    const [conv] = await db.insert(conversations).values({
      mwUserId: user.id,
      mwUsername: user.name,
      title,
    }).returning();
    conversationId = conv.id;
  }

  // Load conversation history
  const history = conversationId ? await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: [asc(chatMessages.createdAt)],
  }) : [];

  // Save user message
  await db.insert(chatMessages).values({
    conversationId,
    role: 'user',
    content: parsed.data.message,
  });

  // Run LangGraph
  const graph = createChatGraph();
  const result = await graph.invoke({
    userMessage: parsed.data.message,
    conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
    selectedAgent: parsed.data.agent || previousAgent,
  });

  // Save assistant message with agent attribution
  const [saved] = await db.insert(chatMessages).values({
    conversationId,
    role: 'assistant',
    content: result.response,
    agentPageTitle: result.selectedAgent,
  }).returning();

  // Update conversation timestamp if first message
  if (history.length === 0) {
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  // Stream response as SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send agent selection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent_selected', agent: result.selectedAgent })}\n\n`));
      // Send conversation ID (for new conversations)
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'conversation', conversationId })}\n\n`));
      // Send full response as text
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: result.response })}\n\n`));
      // Send done
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', message_id: saved.id })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
