// src/app/api/pulse/layout/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { buildLayout } from '@/lib/pulse/layoutBuilder';
import { buildEdges } from '@/lib/pulse/edgeBuilder';
import { BRAIN_MASK } from '@/lib/pulse/brainMask';
import { readLayout, writeLayout } from '@/lib/pulse/layoutCache';
import type { PulseLayout, NodeKind } from '@/lib/pulse/pulseTypes';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Compute the version key from the most-recently-changed embedding row.
  const versionRow = await db.execute<{ version: string }>(sql`
    SELECT GREATEST(
      COALESCE((SELECT MAX(updated_at) FROM agent_embeddings), 'epoch'),
      COALESCE((SELECT MAX(created_at) FROM knowledge_embeddings), 'epoch')
    )::text AS version
  `);
  const version = (versionRow as any[])[0].version;

  const cached = await readLayout();
  if (cached && cached.version === version) {
    return NextResponse.json(cached);
  }

  // Pull agent embeddings.
  const agentRows = await db.execute<{ page_title: string; embedding: string }>(sql`
    SELECT page_title, embedding::text AS embedding FROM agent_embeddings
  `);

  // Pull one embedding chunk per knowledge page (the first chunk is representative).
  const knowledgeRows = await db.execute<{ page_title: string; embedding: string }>(sql`
    SELECT DISTINCT ON (page_title) page_title, embedding::text AS embedding
    FROM knowledge_embeddings
    ORDER BY page_title, chunk_index ASC
  `);

  // Convert pgvector text "[v1,v2,...]" to number[].
  const parseVec = (s: string) =>
    s.replace(/^\[|\]$/g, '').split(',').map(Number);

  // Pull stats so agent node weight reflects helpful-rating signal.
  const stats = await db.query.agentStats.findMany();
  const statsByTitle = new Map(stats.map(s => [s.agentPageTitle, s]));

  const inputs = [
    ...(agentRows as any[]).map(r => {
      const s = statsByTitle.get(r.page_title);
      const total = (s?.helpfulCount ?? 0) + (s?.notHelpfulCount ?? 0);
      const weight =
        total > 0
          ? Math.min(1, (s!.helpfulCount / total) * (Math.log10(total + 1) / 1.5))
          : 0.4;
      return {
        pageTitle: r.page_title,
        kind: 'agent' as NodeKind,
        embedding: parseVec(r.embedding),
        weight,
      };
    }),
    ...(knowledgeRows as any[]).map(r => ({
      pageTitle: r.page_title,
      kind: 'knowledge' as NodeKind,
      embedding: parseVec(r.embedding),
      weight: 0.5,
    })),
  ];

  const { nodes } = buildLayout(inputs, { mask: BRAIN_MASK, seed: 42 });

  const edgeNodes = inputs.map(i => ({
    pageTitle: i.pageTitle,
    embedding: i.embedding,
  }));
  const edges = buildEdges(edgeNodes, { topK: 3, threshold: 0.6 });

  const layout: PulseLayout = { nodes, edges, version };
  await writeLayout(layout);
  return NextResponse.json(layout);
}
