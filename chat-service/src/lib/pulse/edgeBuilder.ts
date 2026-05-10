import type { PulseEdge } from './pulseTypes';

export interface NodeWithEmbedding {
  pageTitle: string;
  embedding: number[];
}

export interface EdgeBuildOpts {
  topK: number;
  threshold: number; // cosine similarity, 0..1
}

export function buildEdges(nodes: NodeWithEmbedding[], opts: EdgeBuildOpts): PulseEdge[] {
  const seen = new Set<string>();
  const out: PulseEdge[] = [];

  // Pre-compute norms once.
  const norms = nodes.map(n => Math.sqrt(n.embedding.reduce((s, v) => s + v * v, 0)) || 1);

  for (let i = 0; i < nodes.length; i++) {
    // Compute similarity to every other node, sorted desc.
    const sims = nodes
      .map((other, j) => {
        if (i === j) return null;
        let dot = 0;
        const a = nodes[i].embedding;
        const b = other.embedding;
        for (let k = 0; k < a.length; k++) dot += a[k] * b[k];
        const sim = dot / (norms[i] * norms[j]);
        return { idx: j, sim };
      })
      .filter((x): x is { idx: number; sim: number } => x !== null)
      .filter(x => x.sim >= opts.threshold)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, opts.topK);

    for (const s of sims) {
      const left = nodes[i].pageTitle;
      const right = nodes[s.idx].pageTitle;
      const key = left < right ? `${left}|${right}` : `${right}|${left}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ source: left, target: right, similarity: s.sim });
    }
  }

  return out;
}
