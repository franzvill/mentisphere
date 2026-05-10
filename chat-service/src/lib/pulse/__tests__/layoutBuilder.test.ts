import { describe, it, expect } from 'vitest';
import { buildLayout } from '../layoutBuilder';

const square = [
  { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 },
];

function makeNodes(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    pageTitle: `Agent:${i}`,
    kind: 'agent' as const,
    embedding: Array.from({ length: 16 }, () => Math.random()),
    weight: 0.5,
  }));
}

describe('buildLayout', () => {
  it('places every node strictly inside the mask', () => {
    const nodes = makeNodes(20);
    const { nodes: positioned } = buildLayout(nodes, { mask: square, seed: 42 });
    for (const n of positioned) {
      expect(n.x).toBeGreaterThanOrEqual(0.2 - 1e-6);
      expect(n.x).toBeLessThanOrEqual(0.8 + 1e-6);
      expect(n.y).toBeGreaterThanOrEqual(0.2 - 1e-6);
      expect(n.y).toBeLessThanOrEqual(0.8 + 1e-6);
    }
  });

  it('is deterministic given a seed', () => {
    const nodes = makeNodes(10);
    const a = buildLayout(nodes, { mask: square, seed: 7 });
    const b = buildLayout(nodes, { mask: square, seed: 7 });
    for (let i = 0; i < a.nodes.length; i++) {
      expect(a.nodes[i].x).toBeCloseTo(b.nodes[i].x, 6);
      expect(a.nodes[i].y).toBeCloseTo(b.nodes[i].y, 6);
    }
  });

  it('maps each input pageTitle to exactly one output node', () => {
    const nodes = makeNodes(5);
    const { nodes: positioned } = buildLayout(nodes, { mask: square, seed: 1 });
    const titles = new Set(positioned.map(n => n.pageTitle));
    expect(titles.size).toBe(5);
  });
});
