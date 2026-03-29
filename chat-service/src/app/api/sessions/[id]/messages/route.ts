import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions, chatMessages, agentStats } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { getPageContent, extractSystemPrompt } from '@/lib/mediawiki/client';
import { getLLMProvider } from '@/lib/llm/provider';
import { eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Load session
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Load agent prompt from MediaWiki
  const page = await getPageContent(session.agentPageTitle);
  if (!page) {
    return NextResponse.json({ error: 'Agent page not found' }, { status: 404 });
  }
  const systemPrompt = extractSystemPrompt(page.wikitext);

  // Load conversation history
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  });

  // Save user message
  await db.insert(chatMessages).values({
    sessionId,
    role: 'user',
    content: parsed.data.content,
  });

  // Build message list for LLM
  const llmMessages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: parsed.data.content },
  ];

  // Stream response
  const provider = getLLMProvider();
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.stream({ systemPrompt, messages: llmMessages })) {
          if (event.type === 'text' && event.text) {
            fullResponse += event.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.text })}\n\n`));
          } else if (event.type === 'done') {
            // Save assistant message
            const [saved] = await db.insert(chatMessages).values({
              sessionId,
              role: 'assistant',
              content: fullResponse,
            }).returning();

            // Update agent stats
            await db.insert(agentStats).values({
              agentPageTitle: session.agentPageTitle,
              totalSessions: 0,
              totalMessages: 1,
            }).onConflictDoUpdate({
              target: agentStats.agentPageTitle,
              set: {
                totalMessages: sql`${agentStats.totalMessages} + 1`,
                updatedAt: sql`now()`,
              },
            });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', message_id: saved.id })}\n\n`));
            controller.close();
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`));
        controller.close();
      }
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  });

  return NextResponse.json({ messages });
}
