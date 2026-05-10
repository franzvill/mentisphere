import { describe, it, expect } from 'vitest';
import { buildEdges } from '../edgeBuilder';

const A = { pageTitle: 'Agent:A', embedding: [1, 0, 0] };
const B = { pageTitle: 'Agent:B', embedding: [0.95, 0.05, 0] }; // very similar to A
const C = { pageTitle: 'Agent:C', embedding: [0, 1, 0] };       // orthogonal
const D = { pageTitle: 'Knowledge:D', embedding: [0.9, 0.1, 0] };// similar to A

describe('buildEdges', () => {
  it('emits edges only above the similarity threshold', () => {
    const edges = buildEdges([A, B, C, D], { topK: 2, threshold: 0.6 });
    const titles = new Set(edges.flatMap(e => [e.source, e.target]));
    expect(titles.has('Agent:C')).toBe(false); // orthogonal, no edge above 0.6
  });

  it('keeps top-K most similar neighbors per node', () => {
    const edges = buildEdges([A, B, C, D], { topK: 1, threshold: 0.6 });
    const fromA = edges.filter(e => e.source === 'Agent:A');
    expect(fromA.length).toBeLessThanOrEqual(1);
  });

  it('deduplicates undirected edges (A→B and B→A are one edge)', () => {
    const edges = buildEdges([A, B], { topK: 5, threshold: 0.6 });
    expect(edges.length).toBe(1);
  });

  it('returns empty when no nodes exceed threshold', () => {
    const E = { pageTitle: 'X', embedding: [1, 0, 0] };
    const F = { pageTitle: 'Y', embedding: [0, 0, 1] };
    expect(buildEdges([E, F], { topK: 5, threshold: 0.6 })).toEqual([]);
  });
});
