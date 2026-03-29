import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { knowledgeEmbeddings } from '@/db/schema';
import { getPageContent } from '@/lib/mediawiki/client';
import { chunkText } from '@/lib/rag/chunker';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const syncSchema = z.object({
  page_title: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Validate internal secret
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

  // Remove old embeddings for this page
  await db.delete(knowledgeEmbeddings)
    .where(eq(knowledgeEmbeddings.pageTitle, parsed.data.page_title));

  // Chunk and embed
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
    chunks_embedded: chunks.length,
    revision_id: page.revisionId,
  });
}
