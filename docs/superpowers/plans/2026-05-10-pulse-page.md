# `/pulse` page implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/pulse` page in chat-service: a brain visualization (PixiJS over a gpt-image backdrop) showing the wiki's collective intelligence, with chat-with-the-brain that lights up activated agents/knowledge in real time, plus an ambient activity stream.

**Architecture:** New Next.js route `/pulse` served by chat-service. Pure server-side libraries (`lib/pulse/*`) compute UMAP layouts and serve them via `/api/pulse/layout`. A module-scoped `activityWatcher` polls MediaWiki recent-changes and listens on a Postgres `pulse_activity` channel, fanning out events through `/api/pulse/stream` (SSE). The existing `/api/chat` route is extended: graph state surfaces `topAgentCandidates` and `knowledgePageTitles`, the route switches from `graph.invoke` to `graph.stream({ streamMode: 'updates' })` and emits `thinking` / `activated` / `selected` SSE events, and a new `surface: 'pulse'` parameter skips DB persistence for ephemeral pulse chats.

**Tech Stack:**
- Next.js 16, React 19, TypeScript (existing chat-service)
- New runtime deps: `pixi.js`, `@pixi/react`, `umap-js`
- New dev deps: `vitest`, `@vitest/coverage-v8`, `pngjs` (one-shot mask trace)
- Spec: `docs/superpowers/specs/2026-05-10-pulse-page-design.md`

---

## Pre-requisites

Before starting Task 1:
1. Read the spec end-to-end. Every decision in the plan is anchored to the spec's Decisions table.
2. Be on a clean working tree. The plan creates ~25 commits on the current branch (`master`).
3. The MediaWiki + chat-service stack runs locally (`docker compose up -d`) so manual smoke tests work.

---

## File structure

```
chat-service/
├── public/
│   └── brain.png                                       # NEW (Task 18, gpt-image one-shot)
├── scripts/
│   └── trace-brain-mask.mjs                            # NEW (Task 19)
├── src/
│   ├── app/
│   │   ├── pulse/
│   │   │   ├── page.tsx                                # NEW (Task 20)
│   │   │   └── PulseClient.tsx                         # NEW (Task 20)
│   │   └── api/
│   │       ├── pulse/
│   │       │   ├── layout/route.ts                     # NEW (Task 8)
│   │       │   └── stream/route.ts                     # NEW (Task 11)
│   │       ├── chat/route.ts                           # MODIFY (Tasks 12–17)
│   │       └── messages/[id]/rate/route.ts             # MODIFY (Task 14)
│   ├── components/pulse/
│   │   ├── BrainCanvas.tsx                             # NEW (Task 21)
│   │   ├── NodeLayer.tsx                               # NEW (Task 22)
│   │   ├── EdgeLayer.tsx                               # NEW (Task 23)
│   │   ├── ChatDock.tsx                                # NEW (Task 24)
│   │   └── ResponseCard.tsx                            # NEW (Task 24)
│   ├── graph/
│   │   ├── state.ts                                    # MODIFY (Task 12)
│   │   ├── router.ts                                   # MODIFY (Task 12)
│   │   └── agent.ts                                    # MODIFY (Task 13)
│   └── lib/pulse/
│       ├── pulseTypes.ts                               # NEW (Task 3)
│       ├── brainMask.ts                                # NEW (Task 4)
│       ├── brainMask.json                              # NEW (Task 19)
│       ├── edgeBuilder.ts                              # NEW (Task 5)
│       ├── layoutBuilder.ts                            # NEW (Task 6)
│       ├── activityWatcher.ts                          # NEW (Task 10)
│       └── README.md                                   # NEW (Task 19)
├── src/lib/pulse/__tests__/                            # NEW (vitest unit tests)
│   ├── brainMask.test.ts                               # NEW (Task 4)
│   ├── edgeBuilder.test.ts                             # NEW (Task 5)
│   ├── layoutBuilder.test.ts                           # NEW (Task 6)
│   └── activityWatcher.test.ts                         # NEW (Task 10)
├── src/graph/__tests__/                                # NEW (vitest)
│   ├── router.test.ts                                  # NEW (Task 12)
│   └── agent.test.ts                                   # NEW (Task 13)
├── src/app/api/chat/__tests__/                         # NEW (vitest)
│   └── route.test.ts                                   # NEW (Task 16)
├── e2e/
│   ├── playwright.config.ts                            # NEW (Task 26)
│   └── pulse.spec.ts                                   # NEW (Task 26)
├── vitest.config.ts                                    # NEW (Task 2)
└── package.json                                        # MODIFY (Tasks 1, 2)
```

**Boundary discipline:**
- `lib/pulse/*` are pure server-side modules — no React, no Pixi.
- `components/pulse/*` are pure client-side components — no DB, no `next/server` imports.
- `pulseTypes.ts` is the only file imported by both. Treat it as the contract.

---

## Task 1: Install runtime dependencies

**Files:**
- Modify: `chat-service/package.json`

- [ ] **Step 1: Install Pixi + UMAP**

```bash
cd chat-service
npm install pixi.js @pixi/react umap-js
```

- [ ] **Step 2: Verify the install resolves cleanly**

```bash
npm ls pixi.js @pixi/react umap-js
```

Expected: each package shown with a version, no `UNMET PEER DEPENDENCY` warnings on `react`. `@pixi/react` requires React 19 — chat-service is already on React 19.2.4.

- [ ] **Step 3: Commit**

```bash
git add chat-service/package.json chat-service/package-lock.json
git commit -m "feat(pulse): add pixi.js, @pixi/react, umap-js runtime deps"
```

---

## Task 2: Set up vitest

**Files:**
- Create: `chat-service/vitest.config.ts`
- Modify: `chat-service/package.json`

- [ ] **Step 1: Install vitest + coverage**

```bash
cd chat-service
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    coverage: { reporter: ['text', 'html'] },
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 4: Verify vitest runs (with no tests)**

```bash
npm test
```

Expected: "No test files found" message, exit code 0. (Vitest does not fail on zero tests.)

- [ ] **Step 5: Commit**

```bash
git add chat-service/vitest.config.ts chat-service/package.json chat-service/package-lock.json
git commit -m "chore(chat-service): add vitest test runner with @ path alias"
```

---

## Task 3: `pulseTypes.ts` — shared type contract

**Files:**
- Create: `chat-service/src/lib/pulse/pulseTypes.ts`

- [ ] **Step 1: Write the file**

```ts
// Shared types between chat-service backend and the /pulse frontend.
// Imported by both routes and React components — keep it dependency-free.

export type NodeKind = 'agent' | 'knowledge' | 'skill';

export interface PulseNode {
  pageTitle: string;
  kind: NodeKind;
  x: number; // 0..1, normalized inside the brain canvas
  y: number; // 0..1
  weight: number; // 0..1, drives glow intensity (rating-driven for agents)
}

export interface PulseEdge {
  source: string; // pageTitle
  target: string; // pageTitle
  similarity: number; // 0..1
}

export interface PulseLayout {
  nodes: PulseNode[];
  edges: PulseEdge[];
  version: string; // ISO timestamp; advances when underlying embeddings change
}

// Activity stream events (SSE) — fanned out by activityWatcher
export type ActivityEvent =
  | { type: 'edit'; pageTitle: string; rcid: number; ts: number }
  | { type: 'spawn'; pageTitle: string; rcid: number; ts: number } // brand-new page
  | { type: 'chat'; agentPageTitle: string; ts: number }
  | { type: 'rating'; agentPageTitle: string; rating: 'helpful' | 'not_helpful'; ts: number };

// /api/chat extended SSE event vocabulary (superset of the existing one)
export type ChatStreamEvent =
  | { type: 'thinking' }
  | { type: 'activated'; kind: 'agent' | 'knowledge'; pageTitles: string[] }
  | { type: 'selected'; pageTitle: string }
  | { type: 'agent_selected'; agent: string | null } // existing
  | { type: 'conversation'; conversationId: string } // existing — never emitted on surface=pulse
  | { type: 'text'; text: string } // existing — full assistant response
  | { type: 'done'; message_id?: string } // existing
  | { type: 'error'; error: string }; // existing
```

- [ ] **Step 2: Verify it typechecks**

```bash
cd chat-service && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/lib/pulse/pulseTypes.ts
git commit -m "feat(pulse): shared type contract (PulseNode, PulseEdge, ChatStreamEvent)"
```

---

## Task 4: `brainMask.ts` — point-in-polygon utilities (TDD)

**Files:**
- Create: `chat-service/src/lib/pulse/brainMask.ts`
- Test: `chat-service/src/lib/pulse/__tests__/brainMask.test.ts`

The mask polygon itself (`brainMask.json`) is generated in Task 19. For now we accept a polygon as a parameter so the module is fully testable without the asset.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/pulse/__tests__/brainMask.test.ts
import { describe, it, expect } from 'vitest';
import { isInside, nearestInsidePoint } from '../brainMask';

// A simple square mask for testing: [(0.2,0.2), (0.8,0.2), (0.8,0.8), (0.2,0.8)]
const square = [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 },
  { x: 0.2, y: 0.8 },
];

describe('isInside', () => {
  it('returns true for clearly inside points', () => {
    expect(isInside(0.5, 0.5, square)).toBe(true);
  });
  it('returns false for clearly outside points', () => {
    expect(isInside(0.0, 0.0, square)).toBe(false);
    expect(isInside(0.9, 0.5, square)).toBe(false);
  });
  it('handles boundary edges deterministically', () => {
    // ray-casting: a point on the boundary may resolve either way; we just
    // require the function returns a stable boolean (no NaN / undefined).
    const result = isInside(0.2, 0.5, square);
    expect(typeof result).toBe('boolean');
  });
});

describe('nearestInsidePoint', () => {
  it('returns the same point if already inside', () => {
    expect(nearestInsidePoint(0.5, 0.5, square)).toEqual({ x: 0.5, y: 0.5 });
  });
  it('snaps an outside point to the closest boundary edge', () => {
    const result = nearestInsidePoint(0.0, 0.5, square);
    expect(result.y).toBeCloseTo(0.5, 5);
    expect(result.x).toBeCloseTo(0.2, 5);
  });
  it('snaps a corner-outside point to the nearest corner', () => {
    const result = nearestInsidePoint(0.0, 0.0, square);
    expect(result.x).toBeCloseTo(0.2, 5);
    expect(result.y).toBeCloseTo(0.2, 5);
  });
});
```

- [ ] **Step 2: Run — verify red**

```bash
cd chat-service && npm test brainMask
```

Expected: FAIL with "Cannot find module '../brainMask'".

- [ ] **Step 3: Implement `brainMask.ts`**

```ts
// src/lib/pulse/brainMask.ts
export interface Point { x: number; y: number }

// Even-odd ray-casting. Boundary cases are intentionally implementation-defined.
export function isInside(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Project (x, y) onto the closest point on the polygon boundary, then return
// that projection. (Geometric: each segment has a closest point; pick min.)
export function nearestInsidePoint(x: number, y: number, polygon: Point[]): Point {
  if (isInside(x, y, polygon)) return { x, y };

  let bestDist = Infinity;
  let best: Point = polygon[0];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    const projected = projectOntoSegment({ x, y }, a, b);
    const d = (projected.x - x) ** 2 + (projected.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = projected;
    }
  }
  return best;
}

function projectOntoSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// Loaded at runtime by callers — see Task 19 (brainMask.json generation).
import maskData from './brainMask.json' with { type: 'json' };

export const BRAIN_MASK: Point[] = maskData as Point[];
```

⚠ The `import ... brainMask.json` will fail until Task 19 creates the file. Until then, comment out the last two lines or stub `brainMask.json` with `[{"x":0,"y":0},{"x":1,"y":0},{"x":1,"y":1},{"x":0,"y":1}]` (full-square placeholder). Tests don't exercise the import.

- [ ] **Step 4: Stub `brainMask.json` with a placeholder**

```bash
echo '[{"x":0,"y":0},{"x":1,"y":0},{"x":1,"y":1},{"x":0,"y":1}]' > chat-service/src/lib/pulse/brainMask.json
```

- [ ] **Step 5: Run — verify green**

```bash
cd chat-service && npm test brainMask
```

Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add chat-service/src/lib/pulse/brainMask.ts chat-service/src/lib/pulse/brainMask.json chat-service/src/lib/pulse/__tests__/brainMask.test.ts
git commit -m "feat(pulse): brainMask point-in-polygon + nearest-inside-point utilities"
```

---

## Task 5: `edgeBuilder.ts` — top-K cosine-similarity edges (TDD)

**Files:**
- Create: `chat-service/src/lib/pulse/edgeBuilder.ts`
- Test: `chat-service/src/lib/pulse/__tests__/edgeBuilder.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/pulse/__tests__/edgeBuilder.test.ts
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
```

- [ ] **Step 2: Run — verify red**

```bash
cd chat-service && npm test edgeBuilder
```

- [ ] **Step 3: Implement `edgeBuilder.ts`**

```ts
// src/lib/pulse/edgeBuilder.ts
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
```

- [ ] **Step 4: Run — verify green**

```bash
cd chat-service && npm test edgeBuilder
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add chat-service/src/lib/pulse/edgeBuilder.ts chat-service/src/lib/pulse/__tests__/edgeBuilder.test.ts
git commit -m "feat(pulse): edgeBuilder — top-K cosine-similarity edges with threshold"
```

---

## Task 6: `layoutBuilder.ts` — UMAP + brain mask warp (TDD)

**Files:**
- Create: `chat-service/src/lib/pulse/layoutBuilder.ts`
- Test: `chat-service/src/lib/pulse/__tests__/layoutBuilder.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/pulse/__tests__/layoutBuilder.test.ts
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
```

- [ ] **Step 2: Run — verify red**

```bash
cd chat-service && npm test layoutBuilder
```

- [ ] **Step 3: Implement `layoutBuilder.ts`**

```ts
// src/lib/pulse/layoutBuilder.ts
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
```

- [ ] **Step 4: Run — verify green**

```bash
cd chat-service && npm test layoutBuilder
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add chat-service/src/lib/pulse/layoutBuilder.ts chat-service/src/lib/pulse/__tests__/layoutBuilder.test.ts
git commit -m "feat(pulse): layoutBuilder — UMAP projection warped into brain mask"
```

---

## Task 7: Layout cache helper (in-memory + disk snapshot)

**Files:**
- Create: `chat-service/src/lib/pulse/layoutCache.ts`
- Modify: `chat-service/.gitignore` (add `chat-service/.cache/`)

- [ ] **Step 1: Add `.cache/` to gitignore**

```bash
echo ".cache/" >> chat-service/.gitignore
```

- [ ] **Step 2: Write `layoutCache.ts`**

```ts
// src/lib/pulse/layoutCache.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PulseLayout } from './pulseTypes';

const CACHE_PATH = path.join(process.cwd(), '.cache', 'pulse', 'layout.json');

let memCache: PulseLayout | null = null;

export async function readLayout(): Promise<PulseLayout | null> {
  if (memCache) return memCache;
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    memCache = JSON.parse(raw) as PulseLayout;
    return memCache;
  } catch {
    return null;
  }
}

export async function writeLayout(layout: PulseLayout): Promise<void> {
  memCache = layout;
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(layout));
}

// For tests
export function _resetMemCache() {
  memCache = null;
}
```

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/lib/pulse/layoutCache.ts chat-service/.gitignore
git commit -m "feat(pulse): in-memory + on-disk layout cache helper"
```

---

## Task 8: `/api/pulse/layout/route.ts` — serve the layout JSON

**Files:**
- Create: `chat-service/src/app/api/pulse/layout/route.ts`

This route gathers embeddings from `agent_embeddings` and `knowledge_embeddings`, computes the layout via `layoutBuilder`, computes edges via `edgeBuilder`, and returns `{nodes, edges, version}`. It checks the in-memory cache first; cache key is the version string.

- [ ] **Step 1: Write the route**

```ts
// src/app/api/pulse/layout/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { buildLayout } from '@/lib/pulse/layoutBuilder';
import { buildEdges } from '@/lib/pulse/edgeBuilder';
import { BRAIN_MASK } from '@/lib/pulse/brainMask';
import { readLayout, writeLayout } from '@/lib/pulse/layoutCache';
import { db as drizzle } from '@/db';
import { agentStats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { PulseLayout, NodeKind } from '@/lib/pulse/pulseTypes';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Compute the version key — see spec, "Caching" section.
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

  // Pull embeddings.
  const agentRows = await db.execute<{ page_title: string; embedding: string }>(sql`
    SELECT page_title, embedding::text AS embedding FROM agent_embeddings
  `);
  const knowledgeRows = await db.execute<{ page_title: string; embedding: string }>(sql`
    SELECT DISTINCT ON (page_title) page_title, embedding::text AS embedding
    FROM knowledge_embeddings
    ORDER BY page_title, chunk_index ASC
  `);

  const parseVec = (s: string) => s.replace(/^\[|\]$/g, '').split(',').map(Number);

  // Pull stats so agent weight reflects helpful ratings.
  const stats = await drizzle.query.agentStats.findMany();
  const statsByTitle = new Map(stats.map(s => [s.agentPageTitle, s]));

  const inputs = [
    ...(agentRows as any[]).map(r => {
      const s = statsByTitle.get(r.page_title);
      const total = (s?.helpfulCount ?? 0) + (s?.notHelpfulCount ?? 0);
      const weight = total > 0 ? Math.min(1, (s!.helpfulCount / total) * Math.log10(total + 1) / 1.5) : 0.4;
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

  // Edges: only between agents and from agents to knowledge.
  const edgeNodes = inputs.map(i => ({ pageTitle: i.pageTitle, embedding: i.embedding }));
  const edges = buildEdges(edgeNodes, { topK: 3, threshold: 0.6 });

  const layout: PulseLayout = { nodes, edges, version };
  await writeLayout(layout);
  return NextResponse.json(layout);
}
```

- [ ] **Step 2: Manual smoke test**

Start the stack (`docker compose up -d`). Hit the route:

```bash
curl -s http://localhost:3000/api/pulse/layout | jq '.nodes | length, .edges | length, .version'
```

Expected: a non-zero node count (matches your seeded agent count + distinct knowledge pages), edges count ≥ 0, a timestamp version.

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/app/api/pulse/layout/route.ts
git commit -m "feat(pulse): /api/pulse/layout — UMAP+edges, in-memory cache, version key"
```

---

## Task 9: Postgres `LISTEN` setup helper

**Files:**
- Create: `chat-service/src/lib/pulse/pgListener.ts`

We need a singleton Postgres connection that holds a long-lived `LISTEN pulse_activity` and broadcasts payloads to subscribers. The existing `@/db` uses `postgres` (npm). That client supports `.listen()`.

- [ ] **Step 1: Inspect existing DB client**

```bash
cd chat-service && grep -r "from 'postgres'" src/ | head
cd chat-service && grep -r "drizzle(" src/ | head
```

Expected: `src/db/index.ts` constructs `postgres(connectionString)` and wraps it in drizzle. Confirm by reading that file. You'll need access to the raw `postgres.Sql` instance to call `.listen()`.

- [ ] **Step 2: Export the raw `sql` client from `@/db`**

If `src/db/index.ts` doesn't already export the raw `postgres` client, modify it to do so:

```ts
// src/db/index.ts (illustrative — match the actual structure)
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export const sqlClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(sqlClient, { schema });
```

- [ ] **Step 3: Write `pgListener.ts`**

```ts
// src/lib/pulse/pgListener.ts
import { sqlClient } from '@/db';
import type { ActivityEvent } from './pulseTypes';

type Listener = (ev: ActivityEvent) => void;

const listeners = new Set<Listener>();
let started = false;

export function subscribe(listener: Listener): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function ensureStarted() {
  if (started) return;
  started = true;
  sqlClient.listen('pulse_activity', payload => {
    try {
      const ev = JSON.parse(payload) as ActivityEvent;
      for (const l of listeners) l(ev);
    } catch (e) {
      console.warn('[pulseActivity] bad payload', e);
    }
  });
}

// For tests
export function _resetForTesting() {
  started = false;
  listeners.clear();
}
```

- [ ] **Step 4: Commit**

```bash
git add chat-service/src/db/index.ts chat-service/src/lib/pulse/pgListener.ts
git commit -m "feat(pulse): pgListener singleton — LISTEN pulse_activity → fanout"
```

---

## Task 10: `activityWatcher.ts` — MW poller + ring buffer (TDD)

**Files:**
- Create: `chat-service/src/lib/pulse/activityWatcher.ts`
- Test: `chat-service/src/lib/pulse/__tests__/activityWatcher.test.ts`

The watcher subscribes to the pgListener (chat / rating events) and also polls MediaWiki recentchanges (edits). It maintains a ring buffer of the last 100 events and broadcasts each new event to subscribers.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/pulse/__tests__/activityWatcher.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityWatcher } from '../activityWatcher';
import type { ActivityEvent } from '../pulseTypes';

describe('ActivityWatcher', () => {
  let watcher: ActivityWatcher;

  beforeEach(() => {
    watcher = new ActivityWatcher({ ringSize: 5 });
  });

  it('keeps only the last N events in the ring buffer', () => {
    for (let i = 0; i < 10; i++) {
      watcher.push({ type: 'edit', pageTitle: `P${i}`, rcid: i, ts: i });
    }
    expect(watcher.snapshot().length).toBe(5);
    expect(watcher.snapshot()[0].rcid).toBe(5);
  });

  it('dedupes edit events by rcid', () => {
    watcher.push({ type: 'edit', pageTitle: 'P', rcid: 1, ts: 1 });
    watcher.push({ type: 'edit', pageTitle: 'P', rcid: 1, ts: 2 });
    expect(watcher.snapshot().length).toBe(1);
  });

  it('broadcasts new events to subscribers', () => {
    const seen: ActivityEvent[] = [];
    const unsub = watcher.subscribe(ev => seen.push(ev));
    watcher.push({ type: 'chat', agentPageTitle: 'Agent:X', ts: 1 });
    expect(seen.length).toBe(1);
    unsub();
    watcher.push({ type: 'chat', agentPageTitle: 'Agent:Y', ts: 2 });
    expect(seen.length).toBe(1); // unsubscribed
  });
});
```

- [ ] **Step 2: Run — verify red**

```bash
cd chat-service && npm test activityWatcher
```

- [ ] **Step 3: Implement `activityWatcher.ts`**

```ts
// src/lib/pulse/activityWatcher.ts
import type { ActivityEvent } from './pulseTypes';
import { subscribe as subscribePg } from './pgListener';

export interface ActivityWatcherOpts {
  ringSize?: number;
  mwApiUrl?: string;
  pollIntervalMs?: number;
}

export class ActivityWatcher {
  private ring: ActivityEvent[] = [];
  private listeners = new Set<(ev: ActivityEvent) => void>();
  private seenRcid = new Set<number>();
  private ringSize: number;
  private mwApiUrl?: string;
  private pollMs: number;
  private pollTimer?: NodeJS.Timeout;
  private pgUnsub?: () => void;

  constructor(opts: ActivityWatcherOpts = {}) {
    this.ringSize = opts.ringSize ?? 100;
    this.mwApiUrl = opts.mwApiUrl;
    this.pollMs = opts.pollIntervalMs ?? 15_000;
  }

  start() {
    this.pgUnsub = subscribePg(ev => this.push(ev));
    if (this.mwApiUrl) {
      this.pollTimer = setInterval(() => this.pollMW().catch(console.warn), this.pollMs);
    }
  }

  stop() {
    this.pgUnsub?.();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  push(ev: ActivityEvent) {
    if ((ev.type === 'edit' || ev.type === 'spawn') && this.seenRcid.has(ev.rcid)) return;
    if (ev.type === 'edit' || ev.type === 'spawn') this.seenRcid.add(ev.rcid);

    this.ring.push(ev);
    if (this.ring.length > this.ringSize) this.ring.shift();
    for (const l of this.listeners) l(ev);
  }

  snapshot(): ActivityEvent[] {
    return [...this.ring];
  }

  subscribe(listener: (ev: ActivityEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async pollMW() {
    if (!this.mwApiUrl) return;
    const url = new URL(this.mwApiUrl);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'recentchanges');
    url.searchParams.set('rcnamespace', '3000|3010|3020'); // Agent, Knowledge, Skill
    url.searchParams.set('rcprop', 'title|ids|timestamp|flags');
    url.searchParams.set('rclimit', '20');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MW poll ${res.status}`);
    const data: any = await res.json();
    const changes = data?.query?.recentchanges ?? [];
    for (const rc of changes) {
      this.push({
        type: rc.new ? 'spawn' : 'edit',
        pageTitle: rc.title,
        rcid: rc.rcid,
        ts: Date.parse(rc.timestamp),
      });
    }
  }
}

// Module-scoped singleton, started lazily on first import from a route handler.
let singleton: ActivityWatcher | null = null;

export function getActivityWatcher(): ActivityWatcher {
  if (!singleton) {
    singleton = new ActivityWatcher({
      mwApiUrl: process.env.MEDIAWIKI_API_URL,
    });
    singleton.start();
  }
  return singleton;
}
```

- [ ] **Step 4: Run — verify green**

```bash
cd chat-service && npm test activityWatcher
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add chat-service/src/lib/pulse/activityWatcher.ts chat-service/src/lib/pulse/__tests__/activityWatcher.test.ts
git commit -m "feat(pulse): activityWatcher — ring buffer + MW poll + pg fanout"
```

---

## Task 11: `/api/pulse/stream/route.ts` — SSE fanout

**Files:**
- Create: `chat-service/src/app/api/pulse/stream/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/pulse/stream/route.ts
import { NextRequest } from 'next/server';
import { getActivityWatcher } from '@/lib/pulse/activityWatcher';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const watcher = getActivityWatcher();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Replay buffer first so the page never looks dead.
      for (const ev of watcher.snapshot()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }

      const unsub = watcher.subscribe(ev => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          // Stream closed; clean up below.
        }
      });

      // Heartbeat every 25s to keep the connection alive through proxies.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // Close handler
      (controller as any)._cleanup = () => {
        unsub();
        clearInterval(heartbeat);
      };
    },
    cancel(reason) {
      // Next.js calls cancel on client disconnect.
      const cleanup = (this as any)._cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

- [ ] **Step 2: Manual smoke test**

```bash
curl -N http://localhost:3000/api/pulse/stream
```

Expected: hangs open. If you `NOTIFY pulse_activity` from psql you should see events arrive:

```bash
docker compose exec postgres psql -U postgres -d chat -c "SELECT pg_notify('pulse_activity', '{\"type\":\"chat\",\"agentPageTitle\":\"Agent:Test\",\"ts\":0}');"
```

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/app/api/pulse/stream/route.ts
git commit -m "feat(pulse): /api/pulse/stream — SSE fanout w/ replay buffer + heartbeat"
```

---

## Task 12: Surface `topAgentCandidates` from the router (TDD)

**Files:**
- Modify: `chat-service/src/graph/state.ts`
- Modify: `chat-service/src/graph/router.ts`
- Test: `chat-service/src/graph/__tests__/router.test.ts`

The spec's "Required graph state additions" calls for `topAgentCandidates: Array<{title, similarity}>` set by `routerNode`. Today the candidates are computed locally and discarded.

- [ ] **Step 1: Add the field to `state.ts`**

Insert into `ChatGraphState`:

```ts
  topAgentCandidates: Annotation<Array<{ title: string; similarity: number }>>({
    reducer: (_, b) => b,
    default: () => [],
  }),
```

- [ ] **Step 2: Write a failing test for the router**

```ts
// src/graph/__tests__/router.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({ db: { execute: vi.fn() } }));
vi.mock('@/lib/rag/embeddings', () => ({
  generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
}));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: async () => ({ choices: [{ message: { content: 'Agent:A' } }] }) } } } }));

import { routerNode } from '../router';
import { db } from '@/db';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routerNode', () => {
  it('returns topAgentCandidates alongside selectedAgent', async () => {
    (db.execute as any).mockResolvedValueOnce([
      { page_title: 'Agent:A', name: 'A', description: '', similarity: 0.9 },
      { page_title: 'Agent:B', name: 'B', description: '', similarity: 0.8 },
    ]);
    const out = await routerNode({
      userMessage: 'hello',
      selectedAgent: null,
    } as any);
    expect(out.selectedAgent).toBe('Agent:A');
    expect(out.topAgentCandidates).toHaveLength(2);
    expect(out.topAgentCandidates[0]).toEqual({ title: 'Agent:A', similarity: 0.9 });
  });

  it('returns empty topAgentCandidates when no candidates found', async () => {
    (db.execute as any).mockResolvedValueOnce([]);
    const out = await routerNode({ userMessage: 'x', selectedAgent: null } as any);
    expect(out.topAgentCandidates).toEqual([]);
  });
});
```

- [ ] **Step 3: Run — verify red**

```bash
cd chat-service && npm test router
```

- [ ] **Step 4: Modify `router.ts` to surface candidates**

In `routerNode`, change the return statements to include `topAgentCandidates`:

```ts
// At each return:
const topAgentCandidates = candidates.map(c => ({ title: c.title, similarity: c.similarity }));
return { selectedAgent, topAgentCandidates };
```

Apply this consistently — including the `state.selectedAgent` short-circuit (return `topAgentCandidates: []` there since no search ran), the empty-candidates path, the single-candidate path, and the LLM-pick path.

- [ ] **Step 5: Run — verify green**

```bash
cd chat-service && npm test router
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add chat-service/src/graph/state.ts chat-service/src/graph/router.ts chat-service/src/graph/__tests__/router.test.ts
git commit -m "feat(graph): surface topAgentCandidates from routerNode for activation events"
```

---

## Task 13: Surface `knowledgePageTitles` from the agent (TDD)

**Files:**
- Modify: `chat-service/src/graph/state.ts`
- Modify: `chat-service/src/graph/agent.ts`
- Test: `chat-service/src/graph/__tests__/agent.test.ts`

- [ ] **Step 1: Add the field to `state.ts`**

```ts
  knowledgePageTitles: Annotation<string[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
```

- [ ] **Step 2: Write a failing test**

```ts
// src/graph/__tests__/agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mediawiki/client', () => ({
  getPageContent: vi.fn(async () => ({ wikitext: '{{AgentPage|systemPrompt=test}}' })),
  extractSystemPrompt: vi.fn(() => 'You are a test agent'),
}));
vi.mock('@/lib/rag/retrieval', () => ({
  retrieveRelevantChunks: vi.fn(async () => [
    { pageTitle: 'Knowledge:A', chunkText: 'one' },
    { pageTitle: 'Knowledge:A', chunkText: 'two' }, // duplicate page
    { pageTitle: 'Knowledge:B', chunkText: 'three' },
  ]),
}));
vi.mock('@/lib/llm/provider', () => ({
  getLLMProvider: () => ({
    stream: async function* () { yield { type: 'text', text: 'response' }; },
  }),
}));
vi.mock('@/db', () => ({ db: { query: { skillRegistry: { findMany: async () => [] } } } }));

import { agentNode } from '../agent';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('agentNode', () => {
  it('returns deduped knowledgePageTitles alongside the response', async () => {
    const out = await agentNode({
      selectedAgent: 'Agent:Test',
      userMessage: 'hi',
      conversationHistory: [],
    } as any);
    expect(out.knowledgePageTitles).toEqual(['Knowledge:A', 'Knowledge:B']);
    expect(out.response).toBe('response');
  });

  it('returns empty knowledgePageTitles when retrieval fails', async () => {
    const { retrieveRelevantChunks } = await import('@/lib/rag/retrieval');
    (retrieveRelevantChunks as any).mockRejectedValueOnce(new Error('boom'));
    const out = await agentNode({
      selectedAgent: 'Agent:Test',
      userMessage: 'hi',
      conversationHistory: [],
    } as any);
    expect(out.knowledgePageTitles).toEqual([]);
  });
});
```

- [ ] **Step 3: Run — verify red**

- [ ] **Step 4: Modify `agent.ts`**

Track `knowledgePageTitles` alongside `knowledgeContext`:

```ts
let knowledgeContext: string | null = null;
let knowledgePageTitles: string[] = [];
try {
  const chunks = await retrieveRelevantChunks(state.userMessage, 5);
  if (chunks.length > 0) {
    knowledgeContext = chunks.map(c => `[${c.pageTitle}]\n${c.chunkText}`).join('\n\n---\n\n');
    knowledgePageTitles = Array.from(new Set(chunks.map(c => c.pageTitle)));
  }
} catch (e) {
  console.warn('[RAG] Retrieval failed:', e);
}
```

And include `knowledgePageTitles` in **every** return statement of `agentNode` (skill-fallback path, normal path, the early "no agent" return, the early "page not loaded" return — those last two get `[]`).

- [ ] **Step 5: Run — verify green**

```bash
cd chat-service && npm test agent
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add chat-service/src/graph/state.ts chat-service/src/graph/agent.ts chat-service/src/graph/__tests__/agent.test.ts
git commit -m "feat(graph): surface knowledgePageTitles (deduped) from agentNode"
```

---

## Task 14: NOTIFY emission in the rate route

**Files:**
- Modify: `chat-service/src/app/api/messages/[id]/rate/route.ts`

- [ ] **Step 1: Add NOTIFY after the rating update**

Insert after the `db.update(chatMessages)` call (line 50 in the existing file):

```ts
import { sqlClient } from '@/db';
// ...
await sqlClient`SELECT pg_notify('pulse_activity', ${JSON.stringify({
  type: 'rating',
  agentPageTitle: session.agentPageTitle,
  rating: parsed.data.rating,
  ts: Date.now(),
})}::text)`;
```

- [ ] **Step 2: Manual smoke test**

While `curl -N http://localhost:3000/api/pulse/stream` is open, post a rating from a logged-in widget session and observe the event.

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/app/api/messages/[id]/rate/route.ts
git commit -m "feat(pulse): emit pulse_activity NOTIFY after rating update"
```

---

## Task 15: Add `surface` parameter + reject `conversationId` on pulse (TDD)

**Files:**
- Modify: `chat-service/src/app/api/chat/route.ts`
- Test: `chat-service/src/app/api/chat/__tests__/route.test.ts`

- [ ] **Step 1: Tighten the zod schema**

Replace the existing `chatSchema` with:

```ts
const chatSchemaBase = z.object({
  message: z.string().min(1).max(10000),
  agent: z.string().optional(),
});
const chatSchemaPersistent = chatSchemaBase.extend({
  surface: z.literal('chat').optional(),
  conversationId: z.string().uuid().optional(),
});
const chatSchemaPulse = chatSchemaBase.extend({
  surface: z.literal('pulse'),
  conversationId: z.undefined({ message: 'conversationId is not allowed when surface=pulse' }).optional(),
});
const chatSchema = z.union([chatSchemaPulse, chatSchemaPersistent]);
```

- [ ] **Step 2: Write a failing test**

The full route test depends on Task 17's refactor. For now, add a focused test that asserts the schema rejects `surface: 'pulse'` + `conversationId`:

```ts
// src/app/api/chat/__tests__/route.test.ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/db', () => ({ db: { query: { conversations: { findFirst: vi.fn() }, chatMessages: { findFirst: vi.fn(), findMany: async () => [] } }, insert: () => ({ values: () => ({ returning: async () => [] }) }) }, sqlClient: { listen: vi.fn() } }));
vi.mock('@/lib/auth', () => ({ authenticateRequest: async () => ({ id: 1, name: 'tester' }) }));
vi.mock('@/graph', () => ({ createChatGraph: () => ({ stream: async function* () { yield { router: { selectedAgent: 'Agent:A', topAgentCandidates: [] } }; yield { agent: { response: 'hi', knowledgePageTitles: [], selectedAgent: 'Agent:A' } }; } }) }));

import { POST } from '../route';

describe('POST /api/chat', () => {
  it('returns 400 when surface=pulse is sent with conversationId', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hi', surface: 'pulse', conversationId: '00000000-0000-0000-0000-000000000000' }),
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run — verify red, then green after the schema change**

```bash
cd chat-service && npm test route
```

- [ ] **Step 4: Commit**

```bash
git add chat-service/src/app/api/chat/route.ts chat-service/src/app/api/chat/__tests__/route.test.ts
git commit -m "feat(chat): zod surface union — reject conversationId on surface=pulse"
```

---

## Task 16: Refactor `/api/chat` to `graph.stream` + emit activation events

**Files:**
- Modify: `chat-service/src/app/api/chat/route.ts`

This is the largest single change. Read the spec section "Chat-with-activation flow → How activation events are emitted" carefully before writing.

- [ ] **Step 1: Replace the `await graph.invoke(...)` call**

```ts
import type { ChatStreamEvent } from '@/lib/pulse/pulseTypes';

// ... inside POST, after auth + parse + history load:

const isPulse = parsed.data.surface === 'pulse';

// Save user message ONLY when persisting (i.e. surface !== 'pulse').
let conversationId: string | undefined;
if (!isPulse) {
  // existing conversation-load / create + user-message insert code stays here.
}

const graph = createChatGraph();
const initialState = {
  userMessage: parsed.data.message,
  conversationHistory: history.map(m => ({ role: m.role, content: m.content })),
  selectedAgent: parsed.data.agent || previousAgent,
  llmProvider: llmProvider || null,
  llmKey: llmKey || null,
  llmModel: llmModel || null,
};

const encoder = new TextEncoder();
const send = (controller: ReadableStreamDefaultController, ev: ChatStreamEvent) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
};

const stream = new ReadableStream({
  async start(controller) {
    try {
      send(controller, { type: 'thinking' });

      let finalResponse = '';
      let finalAgent: string | null = null;
      const iter = graph.stream(initialState as any, { streamMode: 'updates' as any });

      for await (const update of iter as AsyncIterable<Record<string, any>>) {
        if (update.router) {
          const r = update.router;
          if (r.topAgentCandidates?.length) {
            send(controller, {
              type: 'activated',
              kind: 'agent',
              pageTitles: r.topAgentCandidates.map((c: any) => c.title),
            });
          }
          if (r.selectedAgent) {
            send(controller, { type: 'selected', pageTitle: r.selectedAgent });
            send(controller, { type: 'agent_selected', agent: r.selectedAgent });
            finalAgent = r.selectedAgent;
          }
        }
        if (update.agent) {
          const a = update.agent;
          if (a.knowledgePageTitles?.length) {
            send(controller, {
              type: 'activated',
              kind: 'knowledge',
              pageTitles: a.knowledgePageTitles,
            });
          }
          if (typeof a.response === 'string') {
            finalResponse = a.response;
            send(controller, { type: 'text', text: a.response });
          }
        }
      }

      // Persist + NOTIFY.
      let messageId: string | undefined;
      if (!isPulse && conversationId) {
        const [saved] = await db.insert(chatMessages).values({
          conversationId,
          role: 'assistant',
          content: finalResponse,
          agentPageTitle: finalAgent,
        }).returning();
        messageId = saved.id;
        if (history.length === 0) {
          await db.update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));
        }
        send(controller, { type: 'conversation', conversationId });
      }

      // Emit pulse_activity for ambient stream.
      if (finalAgent) {
        await sqlClient`SELECT pg_notify('pulse_activity', ${JSON.stringify({
          type: 'chat',
          agentPageTitle: finalAgent,
          ts: Date.now(),
        })}::text)`;
      }

      send(controller, { type: 'done', message_id: messageId });
      controller.close();
    } catch (err) {
      if (err instanceof NoKeyError) {
        send(controller, { type: 'error', error: 'Please configure your API key in LLM Settings (gear icon) before chatting.' });
      } else {
        console.error('[chat] stream error', err);
        send(controller, { type: 'error', error: 'Internal error' });
      }
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
```

⚠ When `isPulse` is true: do NOT load/create a conversation, do NOT insert the user message, do NOT insert the assistant message, do NOT emit the `conversation` event. The pulse_activity NOTIFY still fires.

- [ ] **Step 2: Verify the existing `/chat` page still works manually**

Open `/chat` in a browser, send a message. Expected: same behavior as before (agent_selected + text + done events; conversation persists).

- [ ] **Step 3: Verify activation events with a `curl` against `/pulse` mode**

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Cookie: <your_mw_session>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are React hooks?","surface":"pulse"}'
```

Expected: `thinking`, `activated · agent`, `selected`, `agent_selected`, `activated · knowledge`, `text`, `done`. NO `conversation` event. NO new rows in `conversations` or `chat_messages`.

- [ ] **Step 4: Commit**

```bash
git add chat-service/src/app/api/chat/route.ts
git commit -m "feat(chat): stream graph updates as activation SSE; surface=pulse skips persistence"
```

---

## Task 17: Route integration test — surface=pulse skips DB

**Files:**
- Modify: `chat-service/src/app/api/chat/__tests__/route.test.ts`

- [ ] **Step 1: Add the test**

Append to the existing test file:

```ts
it('does not write to chatMessages or conversations when surface=pulse', async () => {
  const insertSpy = vi.fn(() => ({ values: vi.fn(() => ({ returning: async () => [{ id: 'X' }] })) }));
  const dbModule = await import('@/db');
  (dbModule.db as any).insert = insertSpy;

  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'hi', surface: 'pulse' }),
  }) as any;
  const res = await POST(req);
  expect(res.status).toBe(200);

  // Read the SSE body and ensure we never inserted.
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    body += dec.decode(value);
  }
  expect(body).toContain('"type":"thinking"');
  expect(body).toContain('"type":"text"');
  expect(body).not.toContain('"type":"conversation"');
  expect(insertSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run**

```bash
cd chat-service && npm test route
```

Expected: 2 tests pass (the schema rejection from Task 15, and this new persistence-skip test).

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/app/api/chat/__tests__/route.test.ts
git commit -m "test(chat): assert surface=pulse skips DB writes"
```

---

## Task 18: Generate `brain.png` (manual one-shot)

**Files:**
- Create: `chat-service/public/brain.png`

This is a manual step using the gpt-image skill.

- [ ] **Step 1: Invoke `/gpt-image` with the spec's prompt**

Use the prompt from the spec's brain-style section:

> Translucent glowing brain, internal cyan and magenta luminescence, fine neural fibers, dark backdrop, cinematic / sci-fi UI aesthetic. Top-down view. Centered subject on a transparent or near-black background. 2048×2048 square crop. The brain silhouette must be cleanly bounded so it can be alpha-traced.

Generate at 2048×2048. If the first output's silhouette is hard to trace (too diffuse, no clear boundary), regenerate with the additional instruction: "give the brain a faint but clear edge, no surrounding wisps."

- [ ] **Step 2: Save the chosen image**

```bash
mv ~/Downloads/brain.png chat-service/public/brain.png
```

- [ ] **Step 3: Sanity-check size/format**

```bash
file chat-service/public/brain.png
identify chat-service/public/brain.png || stat chat-service/public/brain.png
```

Expected: PNG, ~1–4 MB, square aspect.

- [ ] **Step 4: Commit**

```bash
git add chat-service/public/brain.png
git commit -m "feat(pulse): add gpt-image brain backdrop asset"
```

---

## Task 19: Trace `brainMask.json` from the brain image

**Files:**
- Create: `chat-service/scripts/trace-brain-mask.mjs`
- Modify: `chat-service/src/lib/pulse/brainMask.json` (replace placeholder)
- Create: `chat-service/src/lib/pulse/README.md`

- [ ] **Step 1: Install pngjs as devDep**

```bash
cd chat-service && npm install -D pngjs
```

- [ ] **Step 2: Write the tracing script**

```js
// chat-service/scripts/trace-brain-mask.mjs
//
// Traces the largest connected dark region in public/brain.png and writes
// its convex hull as a polygon to src/lib/pulse/brainMask.json.
//
// "Largest dark region" = pixels with average luminance > threshold (the
// brain itself glows; everything else is near-black).

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const inPath = resolve(root, 'public/brain.png');
const outPath = resolve(root, 'src/lib/pulse/brainMask.json');

const png = PNG.sync.read(readFileSync(inPath));
const { width, height, data } = png;
const LUMA_THRESHOLD = 50; // 0..255

const points = [];
const STEP = 8; // sample every 8 pixels for speed
for (let y = 0; y < height; y += STEP) {
  for (let x = 0; x < width; x += STEP) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 100) continue; // ignore transparent
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma > LUMA_THRESHOLD) points.push([x / width, y / height]);
  }
}
if (!points.length) {
  console.error('No bright pixels found — adjust LUMA_THRESHOLD.');
  process.exit(1);
}

// Convex hull (Andrew's monotone chain) — gives a smooth, convex polygon.
points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const lower = [];
for (const p of points) {
  while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
  lower.push(p);
}
const upper = [];
for (let i = points.length - 1; i >= 0; i--) {
  const p = points[i];
  while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
  upper.push(p);
}
const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
const polygon = hull.map(([x, y]) => ({ x, y }));

writeFileSync(outPath, JSON.stringify(polygon, null, 0));
console.log(`Wrote ${polygon.length} polygon points to ${outPath}`);
```

⚠ The convex-hull approach is approximate — a real brain silhouette is concave. For v1 this is good enough (UMAP nodes are warped INSIDE this polygon, so a slightly oversized convex hull just means edges sit closer to a straight outline). If you want a tighter fit later, replace the hull step with a marching-squares trace (still pngjs-only). Document this in the README below.

- [ ] **Step 3: Run the script**

```bash
cd chat-service && node scripts/trace-brain-mask.mjs
```

Expected: "Wrote N polygon points to .../brainMask.json" with N typically 8–24.

- [ ] **Step 4: Re-run brainMask tests**

```bash
cd chat-service && npm test brainMask
```

Expected: still passes (tests don't load `brainMask.json`, they pass polygons explicitly).

- [ ] **Step 5: Write `lib/pulse/README.md`**

```md
# lib/pulse

Server-side modules for the /pulse page.

## Regenerating `brain.png` and `brainMask.json`

The brain backdrop is a one-shot gpt-image generation. To regenerate:

1. Run the gpt-image skill with the prompt documented in `docs/superpowers/specs/2026-05-10-pulse-page-design.md` (style B). Save the output to `public/brain.png` (2048×2048 PNG).
2. Re-trace the polygon mask:
   ```bash
   node scripts/trace-brain-mask.mjs
   ```
3. Inspect `brainMask.json` and the resulting `/pulse` rendering. If too many nodes are clipped to the boundary, adjust `LUMA_THRESHOLD` in the script and re-run.

The current implementation uses a convex hull. If you need a concave fit, replace the hull step in the script with a marching-squares trace (pngjs-only, no native deps).
```

- [ ] **Step 6: Commit**

```bash
git add chat-service/scripts/trace-brain-mask.mjs chat-service/src/lib/pulse/brainMask.json chat-service/src/lib/pulse/README.md chat-service/package.json chat-service/package-lock.json
git commit -m "feat(pulse): trace brainMask.json from brain.png + regen docs"
```

---

## Task 20: `/pulse/page.tsx` + `PulseClient.tsx` skeleton

**Files:**
- Create: `chat-service/src/app/pulse/page.tsx`
- Create: `chat-service/src/app/pulse/PulseClient.tsx`

- [ ] **Step 1: Write `page.tsx`**

```tsx
// src/app/pulse/page.tsx
import { headers } from 'next/headers';
import PulseClient from './PulseClient';
import type { PulseLayout } from '@/lib/pulse/pulseTypes';

export const dynamic = 'force-dynamic';

async function fetchLayout(): Promise<PulseLayout | null> {
  const h = await headers();
  const host = h.get('host')!;
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const res = await fetch(`${proto}://${host}/api/pulse/layout`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function PulsePage() {
  const layout = await fetchLayout();
  return <PulseClient initialLayout={layout} />;
}
```

- [ ] **Step 2: Write `PulseClient.tsx` (skeleton)**

```tsx
// src/app/pulse/PulseClient.tsx
'use client';

import { useEffect, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';

interface Props { initialLayout: PulseLayout | null }

export default function PulseClient({ initialLayout }: Props) {
  const [layout, setLayout] = useState(initialLayout);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [supported, setSupported] = useState<boolean | null>(null);

  // WebGL feature detection — see Task 25.
  useEffect(() => {
    const c = document.createElement('canvas');
    setSupported(!!(c.getContext('webgl2') || c.getContext('webgl')));
  }, []);

  useEffect(() => {
    if (!supported) return;
    const es = new EventSource('/api/pulse/stream');
    es.onmessage = e => {
      try { setActivity(prev => [...prev.slice(-99), JSON.parse(e.data)]); } catch {}
    };
    return () => es.close();
  }, [supported]);

  if (supported === false) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-zinc-300">
        <div className="text-center">
          <p>Your browser doesn&apos;t support this view.</p>
          <a className="underline mt-4 block" href="/chat">Try /chat instead →</a>
        </div>
      </div>
    );
  }

  if (!layout) {
    return <div className="h-screen flex items-center justify-center bg-black text-zinc-400">Loading neural graph…</div>;
  }

  return (
    <div className="h-screen w-screen relative bg-black text-white overflow-hidden">
      {/* BrainCanvas comes in Task 21 */}
      <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
        Layout v{layout.version} — {layout.nodes.length} nodes, {layout.edges.length} edges
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

```bash
cd chat-service && npm run dev
```

Open `http://localhost:3000/pulse`. Expected: black screen with the layout summary.

- [ ] **Step 4: Commit**

```bash
git add chat-service/src/app/pulse/page.tsx chat-service/src/app/pulse/PulseClient.tsx
git commit -m "feat(pulse): /pulse page skeleton + SSE activity wiring"
```

---

## Task 21: `BrainCanvas.tsx` — Pixi stage + brain backdrop

**Files:**
- Create: `chat-service/src/components/pulse/BrainCanvas.tsx`
- Modify: `chat-service/src/app/pulse/PulseClient.tsx`

- [ ] **Step 1: Write `BrainCanvas.tsx`**

```tsx
// src/components/pulse/BrainCanvas.tsx
'use client';

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Texture, Assets } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';
import NodeLayer from './NodeLayer';
import EdgeLayer from './EdgeLayer';

extend({ Container, Sprite });

interface Props {
  layout: PulseLayout;
  activity: ActivityEvent[];
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
}

export default function BrainCanvas({ layout, activity, activated }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [brainTex, setBrainTex] = useState<Texture | null>(null);

  useEffect(() => {
    Assets.load('/brain.png').then((t: Texture) => setBrainTex(t));
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {size.w > 0 && (
        <Application width={size.w} height={size.h} background={0x05070d} antialias>
          <pixiContainer x={size.w / 2} y={size.h / 2}>
            {brainTex && (
              <pixiSprite
                texture={brainTex}
                anchor={0.5}
                width={Math.min(size.w, size.h) * 0.9}
                height={Math.min(size.w, size.h) * 0.9}
                alpha={0.9}
              />
            )}
            <EdgeLayer layout={layout} size={size} activated={activated} />
            <NodeLayer layout={layout} size={size} activity={activity} activated={activated} />
          </pixiContainer>
        </Application>
      )}
    </div>
  );
}
```

⚠ The exact `@pixi/react` API differs slightly between v7 and v8. The above targets v8+ (Application + extend + lowercase `pixi*` JSX). Verify the installed version (`npm ls @pixi/react`) and adapt if needed (v7 uses `<Stage>` and PascalCase `<Container>`/`<Sprite>` directly).

- [ ] **Step 2: Wire `BrainCanvas` into `PulseClient`**

Replace the placeholder div in `PulseClient.tsx`:

```tsx
import BrainCanvas from '@/components/pulse/BrainCanvas';

// inside the component body:
const [activated, setActivated] = useState({
  agents: new Set<string>(),
  knowledge: new Set<string>(),
  selected: null as string | null,
});

// in the render:
<BrainCanvas layout={layout} activity={activity} activated={activated} />
```

- [ ] **Step 3: Manual smoke**

Reload `/pulse`. Expected: brain image visible centered in a black canvas. NodeLayer/EdgeLayer are not yet implemented (Tasks 22-23) — they'll be no-ops or will fail to import; if the import fails, stub them to return `null`.

- [ ] **Step 4: Stub NodeLayer/EdgeLayer minimally so imports resolve**

```tsx
// src/components/pulse/NodeLayer.tsx (stub)
export default function NodeLayer(_: any) { return null; }
```

```tsx
// src/components/pulse/EdgeLayer.tsx (stub)
export default function EdgeLayer(_: any) { return null; }
```

- [ ] **Step 5: Commit**

```bash
git add chat-service/src/components/pulse/BrainCanvas.tsx chat-service/src/components/pulse/NodeLayer.tsx chat-service/src/components/pulse/EdgeLayer.tsx chat-service/src/app/pulse/PulseClient.tsx
git commit -m "feat(pulse): BrainCanvas stage + brain backdrop sprite"
```

---

## Task 22: `NodeLayer.tsx` — render nodes with glow + activation pulse

**Files:**
- Modify: `chat-service/src/components/pulse/NodeLayer.tsx`

Render one Pixi `Graphics` per node. Color by kind. Glow intensity proportional to `weight`. When a node is in `activated.agents` or `activated.knowledge`, brighten + draw a transient pulse ring. When the node's pageTitle appears in `activity` (recent edit/chat/spawn), trigger a one-shot pulse.

- [ ] **Step 1: Write `NodeLayer.tsx`**

```tsx
// src/components/pulse/NodeLayer.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Container, Graphics } from 'pixi.js';
import { extend } from '@pixi/react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';

extend({ Container, Graphics });

interface Props {
  layout: PulseLayout;
  size: { w: number; h: number };
  activity: ActivityEvent[];
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
}

const COLORS = {
  agent: 0xff7a59,
  knowledge: 0x5ec1ff,
  skill: 0x9b8cff,
} as const;

export default function NodeLayer({ layout, size, activated, activity }: Props) {
  const stageSize = Math.min(size.w, size.h) * 0.9;

  // Translate brain-space (0..1) into stage-space (centered).
  const place = (x: number, y: number) => ({
    x: (x - 0.5) * stageSize,
    y: (y - 0.5) * stageSize,
  });

  // Map activity → pulsing pageTitles with timestamp.
  const pulses = new Map<string, number>();
  const now = Date.now();
  for (const ev of activity.slice(-20)) {
    const key = (ev as any).pageTitle ?? (ev as any).agentPageTitle;
    if (!key) continue;
    const tsMs = ev.ts * (ev.ts < 1e12 ? 1000 : 1); // accept seconds OR ms
    if (now - tsMs < 4000) pulses.set(key, tsMs);
  }

  return (
    <pixiContainer>
      {layout.nodes.map(n => {
        const { x, y } = place(n.x, n.y);
        const color = COLORS[n.kind];
        const isActiveAgent = activated.agents.has(n.pageTitle);
        const isActiveKnowledge = activated.knowledge.has(n.pageTitle);
        const isSelected = activated.selected === n.pageTitle;
        const isActive = isActiveAgent || isActiveKnowledge || isSelected;
        const radius = 3 + n.weight * 4 + (isSelected ? 3 : 0);
        const alpha = isActive ? 1 : 0.6;
        const pulseTs = pulses.get(n.pageTitle);

        return (
          <pixiGraphics
            key={n.pageTitle}
            x={x}
            y={y}
            draw={g => {
              g.clear();
              // outer halo
              if (isActive) {
                g.circle(0, 0, radius + 6).fill({ color, alpha: 0.18 });
              }
              g.circle(0, 0, radius).fill({ color, alpha });
              if (isSelected) {
                g.circle(0, 0, radius + 9)
                  .stroke({ color, width: 1, alpha: 0.6 });
              }
              if (pulseTs) {
                const dt = (Date.now() - pulseTs) / 4000; // 0..1 over 4s
                const pr = radius + dt * 30;
                g.circle(0, 0, pr).stroke({ color, width: 1, alpha: 1 - dt });
              }
            }}
          />
        );
      })}
    </pixiContainer>
  );
}
```

- [ ] **Step 2: Add a 60Hz redraw tick so pulses animate**

The `draw` callback only re-runs when React re-renders. Force a tick: in `BrainCanvas`, add a `useTick` from `@pixi/react` (or a `requestAnimationFrame` setState) to drive a `frame` counter that you pass down. For simplicity, use a 30fps interval state in `PulseClient`:

```tsx
// in PulseClient
const [tick, setTick] = useState(0);
useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 33);
  return () => clearInterval(id);
}, []);
// pass tick={tick} down to BrainCanvas, NodeLayer, EdgeLayer (causes re-render → draw re-evaluates)
```

⚠ This is fine for ~50–100 nodes. If you have 1000+, switch to a Pixi ticker (`useTick`) and mutate Graphics in place.

- [ ] **Step 3: Manual smoke**

Reload `/pulse`. Expected: nodes appear at their UMAP-projected positions inside the brain. Activity from `/api/pulse/stream` produces visible pulses (you can fake one with `pg_notify pulse_activity ...`).

- [ ] **Step 4: Commit**

```bash
git add chat-service/src/components/pulse/NodeLayer.tsx chat-service/src/app/pulse/PulseClient.tsx
git commit -m "feat(pulse): NodeLayer — colored nodes, glow, activation halos, activity pulses"
```

---

## Task 23: `EdgeLayer.tsx` — connections + activation paths + traveling dots

**Files:**
- Modify: `chat-service/src/components/pulse/EdgeLayer.tsx`

- [ ] **Step 1: Write `EdgeLayer.tsx`**

```tsx
// src/components/pulse/EdgeLayer.tsx
'use client';

import { Container, Graphics } from 'pixi.js';
import { extend } from '@pixi/react';
import type { PulseLayout } from '@/lib/pulse/pulseTypes';

extend({ Container, Graphics });

interface Props {
  layout: PulseLayout;
  size: { w: number; h: number };
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
  travelingDotPhase?: number; // 0..1, animates 0→1 looped while LLM is generating
}

export default function EdgeLayer({ layout, size, activated, travelingDotPhase = 0 }: Props) {
  const stageSize = Math.min(size.w, size.h) * 0.9;
  const place = (x: number, y: number) => ({
    x: (x - 0.5) * stageSize,
    y: (y - 0.5) * stageSize,
  });

  const positions = new Map(layout.nodes.map(n => [n.pageTitle, place(n.x, n.y)]));

  // An edge is "active" if both endpoints are in the activated set, or one
  // endpoint is the selected agent.
  const isActiveEdge = (sourceTitle: string, targetTitle: string) => {
    const sel = activated.selected;
    return (
      (sel && (sourceTitle === sel || targetTitle === sel)) ||
      (activated.agents.has(sourceTitle) && activated.agents.has(targetTitle)) ||
      (activated.knowledge.has(targetTitle) && (sel === sourceTitle || activated.agents.has(sourceTitle)))
    );
  };

  return (
    <pixiContainer>
      <pixiGraphics
        draw={g => {
          g.clear();
          for (const e of layout.edges) {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) continue;
            const active = isActiveEdge(e.source, e.target);
            const color = active ? 0xffb86b : 0xffffff;
            const alpha = active ? 0.7 : 0.08;
            const width = active ? 1.2 : 0.5;
            g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width, alpha });
            if (active && travelingDotPhase > 0) {
              const t = travelingDotPhase;
              const dx = a.x + (b.x - a.x) * t;
              const dy = a.y + (b.y - a.y) * t;
              g.circle(dx, dy, 2.5).fill({ color: 0xffd9a0, alpha: 0.9 });
            }
          }
        }}
      />
    </pixiContainer>
  );
}
```

- [ ] **Step 2: Drive `travelingDotPhase` from PulseClient**

```tsx
// PulseClient — add a state for "is mid-question" and animate phase 0→1 over ~3s, looping while waiting for `text` event.
```

- [ ] **Step 3: Manual smoke**

Submit a question via the dock (Task 24) and watch active edges light up + a traveling dot move along them.

- [ ] **Step 4: Commit**

```bash
git add chat-service/src/components/pulse/EdgeLayer.tsx
git commit -m "feat(pulse): EdgeLayer — connections, active paths, traveling dots"
```

---

## Task 24: `ChatDock.tsx` + `ResponseCard.tsx`

**Files:**
- Create: `chat-service/src/components/pulse/ChatDock.tsx`
- Create: `chat-service/src/components/pulse/ResponseCard.tsx`
- Modify: `chat-service/src/app/pulse/PulseClient.tsx`

- [ ] **Step 1: Write `ChatDock.tsx`**

```tsx
// src/components/pulse/ChatDock.tsx
'use client';

import { useState, FormEvent } from 'react';

interface Props {
  onSubmit: (q: string) => void;
  busy: boolean;
}

export default function ChatDock({ onSubmit, busy }: Props) {
  const [v, setV] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.trim() || busy) return;
    onSubmit(v.trim());
    setV('');
  };

  return (
    <form
      onSubmit={submit}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[44%] min-w-[420px] max-w-[640px]
                 backdrop-blur bg-white/5 border border-white/10 rounded-full
                 flex items-center gap-3 px-5 py-3"
    >
      <input
        autoFocus
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder={busy ? 'Thinking…' : 'Ask the mind anything…'}
        disabled={busy}
        className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
      />
      <button
        type="submit"
        disabled={busy || !v.trim()}
        className="text-xs uppercase tracking-wider text-zinc-300 disabled:text-zinc-600"
      >
        Ask
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write `ResponseCard.tsx`**

```tsx
// src/components/pulse/ResponseCard.tsx
'use client';

interface Props {
  text: string | null;
  activatedAgents: string[];
  activatedKnowledge: string[];
  onChipHover: (title: string | null) => void;
  onClose: () => void;
}

export default function ResponseCard({
  text, activatedAgents, activatedKnowledge, onChipHover, onClose,
}: Props) {
  if (!text) return null;
  return (
    <div className="absolute bottom-32 right-6 w-[34%] max-w-[420px]
                    backdrop-blur bg-zinc-900/80 border border-white/10 rounded-xl p-4
                    text-zinc-100 text-sm leading-relaxed shadow-xl">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
        {activatedAgents.length} agents · {activatedKnowledge.length} chunks activated
      </div>
      <p>{text}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {[...activatedAgents.map(t => ['agent', t] as const), ...activatedKnowledge.map(t => ['knowledge', t] as const)].map(([kind, t]) => (
          <a
            key={`${kind}:${t}`}
            href={`/wiki/${encodeURIComponent(t)}`}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => onChipHover(t)}
            onMouseLeave={() => onChipHover(null)}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              kind === 'agent' ? 'border-orange-400/40 text-orange-300' : 'border-sky-400/40 text-sky-300'
            }`}
          >
            {t}
          </a>
        ))}
      </div>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-200 text-xs"
      >×</button>
    </div>
  );
}
```

- [ ] **Step 3: Wire both into `PulseClient.tsx`**

Manage state for the in-flight chat: `pending`, `responseText`, `activated`, `activeAgents/Knowledge` lists.

- [ ] **Step 4: Manual smoke**

Type a question; verify chat dock disables while pending; response card slides in with text.

- [ ] **Step 5: Commit**

```bash
git add chat-service/src/components/pulse/ChatDock.tsx chat-service/src/components/pulse/ResponseCard.tsx chat-service/src/app/pulse/PulseClient.tsx
git commit -m "feat(pulse): ChatDock + ResponseCard with activation chip footer"
```

---

## Task 25: Wire chat SSE → activation events

**Files:**
- Modify: `chat-service/src/app/pulse/PulseClient.tsx`

- [ ] **Step 1: Implement `submitQuestion`**

```tsx
async function submitQuestion(q: string) {
  setPending(true);
  setResponseText(null);
  setActivated({ agents: new Set(), knowledge: new Set(), selected: null });

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: q, surface: 'pulse' }),
  });
  if (!res.body) { setPending(false); return; }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split('\n\n');
    buf = events.pop() ?? '';

    for (const ev of events) {
      const line = ev.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      let payload: any;
      try { payload = JSON.parse(line.slice(6)); } catch { continue; }

      if (payload.type === 'thinking') {
        // optional: dim the brain via state
      } else if (payload.type === 'activated' && payload.kind === 'agent') {
        setActivated(a => ({ ...a, agents: new Set([...a.agents, ...payload.pageTitles]) }));
      } else if (payload.type === 'selected') {
        setActivated(a => ({ ...a, selected: payload.pageTitle }));
      } else if (payload.type === 'activated' && payload.kind === 'knowledge') {
        setActivated(a => ({ ...a, knowledge: new Set([...a.knowledge, ...payload.pageTitles]) }));
      } else if (payload.type === 'text') {
        setResponseText(payload.text);
      } else if (payload.type === 'done') {
        setPending(false);
        // Hold lit state, then fade — managed by a timeout that clears `activated` after 6s.
        setTimeout(() => setActivated({ agents: new Set(), knowledge: new Set(), selected: null }), 6000);
      }
    }
  }
}
```

- [ ] **Step 2: Manual smoke — full path**

`/pulse` → ask question → watch agents pulse → selected agent halos → knowledge chunks pulse → response card appears with chips. Confirm `chat_messages` and `conversations` tables in Postgres are NOT touched (`SELECT count(*) FROM chat_messages WHERE created_at > now() - interval '1 minute';` returns 0).

- [ ] **Step 3: Commit**

```bash
git add chat-service/src/app/pulse/PulseClient.tsx
git commit -m "feat(pulse): wire /api/chat SSE → activation lighting + response card"
```

---

## Task 26: Playwright smoke test

**Files:**
- Create: `chat-service/e2e/playwright.config.ts`
- Create: `chat-service/e2e/pulse.spec.ts`
- Modify: `chat-service/package.json`

- [ ] **Step 1: Install Playwright**

```bash
cd chat-service && npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PULSE_E2E_URL || 'http://localhost:3000',
    headless: true,
    storageState: process.env.PULSE_E2E_STATE, // optional: path to logged-in MW session
  },
});
```

- [ ] **Step 3: Write `pulse.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('/pulse loads with brain backdrop and at least one node', async ({ page }) => {
  const layoutResponse = page.waitForResponse(/\/api\/pulse\/layout/);
  await page.goto('/pulse');
  const layout = await layoutResponse;
  expect(layout.status()).toBe(200);
  const body = await layout.json();
  expect(body.nodes.length).toBeGreaterThan(0);

  // Wait for the canvas to mount.
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
});

test('asking a question triggers activation events (auth required)', async ({ page }) => {
  test.skip(!process.env.PULSE_E2E_STATE, 'No logged-in storageState provided');

  await page.goto('/pulse');
  await page.locator('input[placeholder*="Ask the mind"]').fill('What are React hooks?');
  await page.locator('input[placeholder*="Ask the mind"]').press('Enter');

  // Response card appears once `text` event arrives.
  await expect(page.locator('text=/agents · .*chunks activated/')).toBeVisible({ timeout: 30000 });
});
```

- [ ] **Step 4: Add scripts**

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 5: Run (with the dev server running)**

```bash
cd chat-service && npm run dev &
cd chat-service && npm run test:e2e
```

Expected: the first test passes; the second skips unless `PULSE_E2E_STATE` is set.

- [ ] **Step 6: Commit**

```bash
git add chat-service/e2e chat-service/package.json chat-service/package-lock.json
git commit -m "test(pulse): Playwright smoke — layout fetch + canvas mount"
```

---

## Acceptance checklist (run before declaring done)

Manual end-to-end on a running stack:

- [ ] `/pulse` renders with the gpt-image brain backdrop visible.
- [ ] Nodes appear at UMAP-clustered positions inside the brain silhouette (no nodes outside).
- [ ] Ambient pulses fire when you edit an Agent/Knowledge/Skill page in MediaWiki (within 15s).
- [ ] Ambient pulses fire when you submit a `/chat` message in another tab (immediately, via NOTIFY).
- [ ] Submitting a `/pulse` question lights up agent candidates → highlights selected agent → lights up knowledge chunks → response card slides in with text and chips.
- [ ] Chips in the response card open the corresponding wiki pages.
- [ ] No new rows in `conversations` or `chat_messages` for `/pulse` questions.
- [ ] Disabling WebGL (chrome://settings → block GPU) on `/pulse` shows the static fallback linking to `/chat`.
- [ ] `npm test` passes (all unit tests).
- [ ] `npm run test:e2e` passes the layout smoke test.

---

## Dependency graph (for parallel execution)

```
1 → 2 → 3
3 → 4 → 5 → 6 → 7 → 8
3 → 9 → 10 → 11
3 → 12 → 13
13 → 14
13 → 15 → 16 → 17
8 + 17 → 18 → 19  (asset chain, blocks frontend)
17 → 20 → 21 → {22, 23} → 24 → 25 → 26
```

Subagent-driven execution: 4-6, 7, 9-10, 12-13, 14 can run roughly in parallel after 3. Frontend (20-25) is sequential.
