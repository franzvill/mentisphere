import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { knowledgeEmbeddings, skillRegistry } from '@/db/schema';
import { getPageContent } from '@/lib/mediawiki/client';
import { chunkText } from '@/lib/rag/chunker';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const syncSchema = z.object({
  page_title: z.string().min(1),
  type: z.enum(['knowledge', 'skill']).default('knowledge'),
});

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-service-secret');
  if (secret !== process.env.CHAT_SERVICE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const page = await getPageContent(parsed.data.page_title);
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  if (parsed.data.type === 'skill') {
    // Parse template fields for skill registry
    const nameMatch = page.wikitext.match(/\|\s*title\s*=\s*([^\n|}]+)/);
    const capabilityMatch = page.wikitext.match(/\|\s*capability\s*=\s*([^\n|}]+)/);

    const name = nameMatch ? nameMatch[1].trim() : parsed.data.page_title.replace('Skill:', '').replace(/_/g, ' ');
    const description = capabilityMatch ? capabilityMatch[1].trim() : 'No description';

    await db.insert(skillRegistry).values({
      pageTitle: parsed.data.page_title,
      name,
      description,
    }).onConflictDoUpdate({
      target: skillRegistry.pageTitle,
      set: { name, description, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, type: 'skill', name, description });
  }

  // Knowledge: chunk + embed (existing behavior)
  await db.delete(knowledgeEmbeddings)
    .where(eq(knowledgeEmbeddings.pageTitle, parsed.data.page_title));

  const chunks = chunkText(page.wikitext);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    await db.insert(knowledgeEmbeddings).values({
      pageTitle: parsed.data.page_title,
      pageRevisionId: page.revisionId,
      chunkIndex: chunk.index,
      chunkText: chunk.text,
      embedding: embedding,
    });
  }

  return NextResponse.json({
    success: true,
    type: 'knowledge',
    chunks_embedded: chunks.length,
    revision_id: page.revisionId,
  });
}
