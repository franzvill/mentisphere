import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agentEmbeddings } from '@/db/schema';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

  if (!q) {
    // Return all agents (for browsing)
    const all = await db.query.agentEmbeddings.findMany({
      columns: { pageTitle: true, name: true, description: true },
    });
    return NextResponse.json({ agents: all });
  }

  // Semantic search
  try {
    const queryEmbedding = await generateEmbedding(q);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const results = await db.execute(
      sql`SELECT page_title, name, description,
               1 - (embedding <=> ${embeddingStr}::vector) as similarity
          FROM agent_embeddings
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT ${limit}`
    );

    return NextResponse.json({
      agents: (results as any[]).map(r => ({
        pageTitle: r.page_title,
        name: r.name,
        description: r.description,
        similarity: r.similarity,
      })),
    });
  } catch (e) {
    // Fallback to text search if embeddings fail
    const results = await db.query.agentEmbeddings.findMany({
      where: ilike(agentEmbeddings.name, `%${q}%`),
      columns: { pageTitle: true, name: true, description: true },
      limit,
    });
    return NextResponse.json({ agents: results });
  }
}
