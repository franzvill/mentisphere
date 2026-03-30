import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions, chatMessages, agentStats, skillRegistry } from '@/db/schema';
import { authenticateRequest } from '@/lib/auth';
import { getPageContent, extractSystemPrompt } from '@/lib/mediawiki/client';
import { getLLMProvider } from '@/lib/llm/provider';
import { retrieveRelevantChunks } from '@/lib/rag/retrieval';
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

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });
  if (!session || session.mwUserId !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const page = await getPageContent(session.agentPageTitle);
  if (!page) {
    return NextResponse.json({ error: 'Agent page not found' }, { status: 404 });
  }
  const systemPrompt = extractSystemPrompt(page.wikitext);

  // --- RAG: find relevant knowledge ---
  let knowledgeContext: string | undefined;
  try {
    const chunks = await retrieveRelevantChunks(parsed.data.content, 5);
    if (chunks.length > 0) {
      knowledgeContext = chunks.map(c => `[${c.pageTitle}]\n${c.chunkText}`).join('\n\n---\n\n');
    }
  } catch (e) {
    console.warn('[RAG] Knowledge retrieval failed:', e);
  }

  // --- Skills: build catalog ---
  let systemPromptFinal = systemPrompt;
  const allSkills = await db.query.skillRegistry.findMany();
  if (allSkills.length > 0) {
    systemPromptFinal += '\n\n---\nAvailable Skills (if a skill would help answer the user, respond ONLY with [USE_SKILL: Skill:Page_Name] and nothing else):\n'
      + allSkills.map(s => `- ${s.pageTitle} — ${s.description}`).join('\n');
  }

  // Load history + save user message
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: [asc(chatMessages.createdAt)],
  });

  await db.insert(chatMessages).values({
    sessionId,
    role: 'user',
    content: parsed.data.content,
  });

  const llmMessages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: parsed.data.content },
  ];

  const provider = getLLMProvider();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Phase 1: Collect first response (check for skill invocation)
        let firstResponse = '';
        for await (const event of provider.stream({
          systemPrompt: systemPromptFinal,
          messages: llmMessages,
          knowledgeContext,
        })) {
          if (event.type === 'text' && event.text) {
            firstResponse += event.text;
          }
        }

        // Phase 2: Check for skill invocation
        const skillMatch = firstResponse.match(/\[USE_SKILL:\s*(Skill:[^\]]+)\]/);

        let finalResponse: string;

        if (skillMatch) {
          // Skill invoked — fetch skill page and re-run with skill instructions
          const skillTitle = skillMatch[1].trim();
          console.log(`[SKILL] Agent invoked: ${skillTitle}`);
          const skillPage = await getPageContent(skillTitle);

          if (skillPage) {
            const skillContent = extractSystemPrompt(skillPage.wikitext);
            let skillResponse = '';

            for await (const event of provider.stream({
              systemPrompt: systemPromptFinal,
              messages: llmMessages,
              skillInstructions: `You are now using the skill "${skillTitle}". Follow these instructions precisely:\n\n${skillContent}`,
              knowledgeContext,
            })) {
              if (event.type === 'text' && event.text) {
                skillResponse += event.text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.text })}\n\n`));
              }
            }
            finalResponse = skillResponse;
          } else {
            // Skill page not found — stream the original response
            console.warn(`[SKILL] Page not found: ${skillTitle}`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: firstResponse })}\n\n`));
            finalResponse = firstResponse;
          }
        } else {
          // No skill invoked — stream the first response
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: firstResponse })}\n\n`));
          finalResponse = firstResponse;
        }

        // Save assistant message
        const [saved] = await db.insert(chatMessages).values({
          sessionId,
          role: 'assistant',
          content: finalResponse,
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
