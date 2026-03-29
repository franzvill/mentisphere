import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateEmbedding } from './embeddings';

export interface RetrievedChunk {
  pageTitle: string;
  chunkText: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  pageTitles: string[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  if (pageTitles.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Use parameterized query for page titles to prevent SQL injection
  const result = await db.execute(
    sql`SELECT page_title, chunk_text,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM knowledge_embeddings
        WHERE page_title = ANY(${pageTitles})
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}`
  );

  return (result as any[]).map(row => ({
    pageTitle: row.page_title,
    chunkText: row.chunk_text,
    similarity: row.similarity,
  }));
}
