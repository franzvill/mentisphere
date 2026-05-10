import { NextRequest, NextResponse } from 'next/server';
import { db, sqlClient } from '@/db';
import { conversations, chatMessages } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { createChatGraph } from '@/graph';
import { NoKeyError } from '@/lib/llm/provider';
import type { LLMProviderType } from '@/lib/llm/types';
import { eq, asc, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { ChatStreamEvent } from '@/lib/pulse/pulseTypes';

const chatSchemaBase = z.object({
  message: z.string().min(1).max(10000),
  agent: z.string().optional(),
});
const chatSchemaPersistent = chatSchemaBase.extend({
  surface: z.literal('chat').optional(),
  conversationId: z.string().uuid().optional(),
});
const chatSchemaPulse = chatSchemaBase.extend({
  surface: z.literal('pulse'),
  conversationId: z.undefined({ message: 'conversationId is not allowed when surface=pulse' }).optional(),
});
const chatSchema = z.union([chatSchemaPulse, chatSchemaPersistent]);

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

  const isPulse = parsed.data.surface === 'pulse';

  // History + conversation handling: only when persistent
  let history: Array<{ role: string; content: string; agentPageTitle?: string | null }> = [];
  let conversationId: string | undefined;
  let previousAgent: string | null = null;

  if (!isPulse) {
    conversationId = parsed.data.conversationId;

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

    history = conversationId ? await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, conversationId),
      orderBy: [asc(chatMessages.createdAt)],
    }) : [];

    await db.insert(chatMessages).values({
      conversationId,
      role: 'user',
      content: parsed.data.message,
    });
  }

  // Read BYOK headers
  const llmProvider = request.headers.get('x-llm-provider') as LLMProviderType | null;
  const llmKey = request.headers.get('x-llm-key');
  const llmModel = request.headers.get('x-llm-model');

  const initialState = {
    userMessage: parsed.data.message,
    conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
    selectedAgent: parsed.data.agent || previousAgent,
    llmProvider: llmProvider || null,
    llmKey: llmKey || null,
    llmModel: llmModel || null,
  };

  const graph = createChatGraph();
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, ev: ChatStreamEvent) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, { type: 'thinking' });

        let finalResponse = '';
        let finalAgent: string | null = null;
        const iter = (await graph.stream(initialState as any, { streamMode: 'updates' as any })) as unknown as AsyncIterable<Record<string, any>>;

        for await (const update of iter) {
          if (update.router) {
            const r = update.router;
            if (r.topAgentCandidates?.length) {
              send(controller, {
                type: 'activated',
                kind: 'agent',
                pageTitles: r.topAgentCandidates.map((c: any) => c.title),
              });
            }
            if (r.selectedAgent) {
              // `selected` is the new pulse vocabulary; `agent_selected` is the legacy event
              // that the existing /chat client already listens for — keep both.
              send(controller, { type: 'selected', pageTitle: r.selectedAgent });
              send(controller, { type: 'agent_selected', agent: r.selectedAgent });
              finalAgent = r.selectedAgent;
            }
          }
          if (update.agent) {
            const a = update.agent;
            if (a.knowledgePageTitles?.length) {
              send(controller, {
                type: 'activated',
                kind: 'knowledge',
                pageTitles: a.knowledgePageTitles,
              });
            }
            if (typeof a.response === 'string') {
              finalResponse = a.response;
              send(controller, { type: 'text', text: a.response });
            }
          }
        }

        // Persist + emit conversation event for the persistent path only.
        let messageId: string | undefined;
        if (!isPulse && conversationId) {
          const [saved] = await db.insert(chatMessages).values({
            conversationId,
            role: 'assistant',
            content: finalResponse,
            agentPageTitle: finalAgent,
          }).returning();
          messageId = saved.id;
          if (history.length === 0) {
            await db.update(conversations)
              .set({ updatedAt: new Date() })
              .where(eq(conversations.id, conversationId));
          }
          send(controller, { type: 'conversation', conversationId });
        }

        // Emit pulse_activity NOTIFY for the ambient stream (both surfaces).
        if (finalAgent) {
          await sqlClient`SELECT pg_notify('pulse_activity', ${JSON.stringify({
            type: 'chat',
            agentPageTitle: finalAgent,
            ts: Date.now(),
          })}::text)`;
        }

        send(controller, { type: 'done', message_id: messageId });
        controller.close();
      } catch (err) {
        if (err instanceof NoKeyError) {
          send(controller, { type: 'error', error: 'Please configure your API key in LLM Settings (gear icon) before chatting.' });
        } else {
          console.error('[chat] stream error', err);
          send(controller, { type: 'error', error: 'Internal error' });
        }
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
