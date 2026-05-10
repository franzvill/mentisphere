import { UMAP } from 'umap-js';
import type { PulseNode, NodeKind } from './pulseTypes';
import { nearestInsidePoint, type Point } from './brainMask';

export interface LayoutInput {
  pageTitle: string;
  kind: NodeKind;
  embedding: number[];
  weight: number;
}

export interface BuildLayoutOpts {
  mask: Point[];   // brain silhouette polygon, points in [0,1]
  seed?: number;
}

export function buildLayout(
  inputs: LayoutInput[],
  opts: BuildLayoutOpts,
): { nodes: PulseNode[] } {
  if (inputs.length === 0) return { nodes: [] };

  const seed = opts.seed ?? 42;
  const random = mulberry32(seed);

  // UMAP requires at least 2 inputs to project.
  let projected: number[][];
  if (inputs.length === 1) {
    projected = [[0.5, 0.5]];
  } else {
    const umap = new UMAP({
      nComponents: 2,
      nNeighbors: Math.min(15, inputs.length - 1),
      minDist: 0.1,
      random,
    });
    projected = umap.fit(inputs.map(n => n.embedding));
  }

  // Normalize projected coords to [0,1] using bounding box.
  const xs = projected.map(p => p[0]);
  const ys = projected.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const nodes: PulseNode[] = inputs.map((input, i) => {
    const nx = (projected[i][0] - minX) / rangeX;
    const ny = (projected[i][1] - minY) / rangeY;
    const snapped = nearestInsidePoint(nx, ny, opts.mask);
    return {
      pageTitle: input.pageTitle,
      kind: input.kind,
      x: snapped.x,
      y: snapped.y,
      weight: input.weight,
    };
  });

  return { nodes };
}

// Tiny seeded PRNG. UMAP-js accepts any zero-arg () => number.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
