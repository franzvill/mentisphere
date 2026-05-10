# `/pulse` page — design

**Status:** draft
**Date:** 2026-05-10
**Owner:** fvillano

A dedicated visualization page for MentiSphere that renders the wiki's collective intelligence as a glowing brain. Visitors can chat with "the mind" and watch which agents and knowledge chunks light up as it answers. Ambient pulses reflect ongoing edits and conversations across the platform.

## Goals

1. Make the platform's growth tangible: as wiki contributors add agents, knowledge, and skills, the visualization densifies.
2. Make routing transparent: when the LLM picks an agent and pulls knowledge for a question, users *see* that decision happen on the brain.
3. Land a strong hero surface for the project that doubles as a working demo of the underlying RAG + router.

## Non-goals

- Replacing `/chat` (the existing unified chat surface stays).
- Persisting `/pulse` conversations (they are ephemeral by design).
- Mobile parity at v1 — a desktop-first WebGL canvas; mobile gets a static fallback message linking to `/chat`.
- Multi-language UI strings — English only at v1.
- Authoring / editing the brain image at runtime — the backdrop is a one-shot static asset.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Where it lives | Dedicated `/pulse` route under chat-service | Hero surface, viz-first, room to be heavier than other pages. |
| Visual metaphor | Literal brain silhouette | Strongest narrative ("this is a mind"); user explicitly chose it over an orb or layered constellation. |
| Brain backdrop | Static `public/brain.png` generated once with gpt-image, glowing-neural sci-fi aesthetic | Hits the cinematic vibe; cheaper than animating a brain shape from scratch. |
| Growth signals | All four — quantity (more nodes), connectivity (more edges), quality (glow), activity (pulses) | User wants the page to read as alive on every axis. |
| Node positioning | UMAP projection of agent + knowledge embeddings, warped into the brain mask | Similar agents cluster — lit-up regions become topically meaningful, not just decorative. |
| Page layout | Brain centered + floating chat dock + sliding response card | Brain stays the protagonist; long answers don't crowd it. |
| Chat scope | New experience on `/pulse`, reuses `/api/chat` extended with activation SSE events, ephemeral (no DB persistence) | Avoids duplicating the chat backend; keeps `/pulse` from polluting the conversations sidebar. |
| Render tech | PixiJS via `@pixi/react` | GPU-accelerated 2D, native glow / particle effects, scales to thousands of nodes — best fit for the aesthetic. |
| v1 scope | Ship full vision in one cut: brain + UMAP nodes + chat-with-activation + ambient activity stream | The page only feels alive with all four; phased rollout would ship a dead-looking page first. |

## Architecture

```
chat-service (Next.js 16)

  /pulse (page)
    PixiJS canvas: gpt-image brain backdrop + node graph
    Chat dock + sliding response card
      │
      ├─► GET  /api/pulse/layout      (one-shot: nodes + edges JSON)
      ├─► GET  /api/pulse/stream      (SSE: ambient activity)
      └─► POST /api/chat              (extended: emits node_activated)

  Background (server module-scoped):
    layoutBuilder.ts      UMAP recompute, runs nightly + on cache miss
    activityWatcher.ts    polls MW recent-changes API every 15s,
                          listens on Postgres NOTIFY for chat activity,
                          fans events out via SSE

Data sources (all already exist):
  pgvector  agent_embeddings, knowledge_embeddings  → UMAP, edges
  postgres  agent_stats, chat_messages              → glow, pulses
  MW API    recent-changes (?action=query&list=…)   → ambient pulses
  Static    /public/brain.png                       → backdrop
```

**Three new things ship together:**
1. `/pulse` page (the visualization).
2. `/api/pulse/layout` and `/api/pulse/stream` endpoints.
3. New SSE event types added to `/api/chat`.

**No DB schema changes.** Everything reads from existing tables. Layout snapshots are persisted as a JSON file under `chat-service/.cache/pulse/layout.json`, not the database.

## Components & file layout

```
chat-service/
├── public/
│   └── brain.png                        # gpt-image asset (one-shot)
├── src/
│   ├── app/
│   │   ├── pulse/
│   │   │   ├── page.tsx                 # server component, fetches layout
│   │   │   └── PulseClient.tsx          # 'use client', holds Pixi + chat
│   │   └── api/
│   │       ├── pulse/
│   │       │   ├── layout/route.ts      # GET → {nodes, edges, version}
│   │       │   └── stream/route.ts      # GET → SSE ambient events
│   │       └── chat/route.ts            # ✏ extend: emit activation events
│   ├── components/pulse/
│   │   ├── BrainCanvas.tsx              # @pixi/react stage, image + nodes
│   │   ├── NodeLayer.tsx                # nodes, glow, pulses
│   │   ├── EdgeLayer.tsx                # connections, activation paths
│   │   ├── ChatDock.tsx                 # bottom floating input
│   │   └── ResponseCard.tsx             # sliding answer card
│   └── lib/pulse/
│       ├── layoutBuilder.ts             # UMAP, brain-mask placement
│       ├── brainMask.ts                 # silhouette polygon, point-in-shape
│       ├── brainMask.json               # traced polygon, committed
│       ├── edgeBuilder.ts               # cosine-sim edge selection
│       ├── activityWatcher.ts           # MW poll + LISTEN + ring buffer + fanout
│       ├── pulseTypes.ts                # shared types (Node, Edge, Event)
│       └── README.md                    # how to regenerate brain.png + mask
└── package.json                         # + pixi.js, @pixi/react, umap-js
```

**Boundaries:**
- `BrainCanvas` owns the Pixi stage; subcomponents only render. Single requestAnimationFrame loop.
- `layoutBuilder` is a pure function: `(embeddings, stats) → {nodes, edges}`. No I/O; testable in isolation.
- `activityWatcher` is a singleton (module-scoped) — one MW poller per Next.js process feeds many SSE clients.
- `pulseTypes.ts` is the single contract between frontend and backend. Both import from it.

## Data pipeline

**Layout build (server-side, in `layoutBuilder.ts`):**

```
agent_embeddings + knowledge_embeddings (pgvector, 1536-dim)
        │
        ▼
   UMAP n=2  (umap-js, deterministic seed)
        │
        ▼
   normalize to [0, 1]² unit square
        │
        ▼
   warp into brain mask
   (rejection sampling + soft attraction toward nearest in-mask point)
        │
        ▼
   {pageTitle, x, y, type: 'agent' | 'knowledge' | 'skill', weight} per node
```

**Brain mask** — `brainMask.json` stores the silhouette polygon as a list of `{x, y}` points (traced once from `brain.png`). `brainMask.ts` exports:
- `isInside(x, y) → boolean`
- `nearestInsidePoint(x, y) → {x, y}`

**Edge selection** — for each agent, find top-K (K=3) most similar agents and most similar knowledge chunks via cosine similarity. Filter: keep only edges with `sim > 0.6`. The result is a sparse, semantically meaningful graph.

**Caching** — `/api/pulse/layout` returns `{nodes, edges, version}` where `version = max(updated_at)` across `agent_embeddings + knowledge_embeddings`. The route holds an in-memory cache keyed by version; on cache miss it recomputes UMAP and persists a snapshot to `.cache/pulse/layout.json`. Frontend pins to a version and refetches every few minutes.

**Stability** — UMAP is non-deterministic without a seed; we seed with a constant. We also persist node positions to disk and only recompute when (a) a new node appears, or (b) embeddings change for >10% of nodes. New nodes get placed via "best position relative to nearest neighbors" rather than reshuffling the whole layout. The brain doesn't visibly twitch on every page-load.

**Ambient activity sources:**

| Source | Detection | Visual reaction |
|---|---|---|
| New / edited wiki page | MW API `?action=query&list=recentchanges` polled every 15s | Pulse on the corresponding node — or a "spawn" animation if it's a brand-new page |
| Chat message arrives | activityWatcher subscribes to Postgres `LISTEN` channel; chat-service `NOTIFY`s on insert | Pulse on the agent that responded |
| Helpful rating | Same `NOTIFY` mechanism on `chat_messages.rating` update | Brief brighter glow on the agent |

`activityWatcher` keeps a ring buffer of the last 100 events and broadcasts each new event via SSE. New `/pulse` clients receive the buffer on connect (so the page never looks dead) and live events thereafter.

## Chat-with-activation flow

The "watch it think" feature reuses `/api/chat` end-to-end. The backend simply emits new SSE event types at moments that already exist in the router.

```
USER types question  →  POST /api/chat  (with surface: 'pulse', ephemeral: true)
                                │
                                ▼
       ┌──────────────────────────────────────────────────────────┐
       │ existing router code path                                 │
       │                                                            │
       │ 1. embed(query)             ──► event: thinking            │
       │ 2. pgvector top-K agents    ──► event: activated  (agent)  │
       │ 3. LLM picks one agent      ──► event: selected   (agent)  │
       │ 4. RAG: top-K knowledge     ──► event: activated  (know)   │
       │ 5. stream agent response    ──► event: token (× many)      │
       │ 6. done                     ──► event: done               │
       └──────────────────────────────────────────────────────────┘
```

**SSE event contract (added to `pulseTypes.ts`):**

```ts
type StreamEvent =
  | { type: 'thinking' }
  | { type: 'activated'; kind: 'agent' | 'knowledge'; pageTitles: string[] }
  | { type: 'selected'; pageTitle: string }            // the chosen agent
  | { type: 'token'; text: string }                    // existing
  | { type: 'done' }
  | { type: 'error'; message: string };
```

The router already returns top-K candidates and a chosen agent — we just expose what's there. **No new LLM calls.**

**Frontend choreography (in `BrainCanvas`):**

| Event | Visual reaction |
|---|---|
| `thinking` | Whole brain dims to ~40% brightness — "concentrating" |
| `activated · agent` | Listed agent nodes brighten + pulse ring; their inter-edges fade in |
| `selected` | The selected agent gets a stronger glow + a thin orbiting halo |
| `activated · knowledge` | Knowledge chunks brighten; edges from selected agent → those chunks light up amber |
| `token` | Subtle traveling dot along one of the active edges, paced loosely to streaming. Response text appears in `ResponseCard` |
| `done` | Hold lit state 4s, then ease back to ambient over 2s |

**Response card** (`ResponseCard.tsx`) — translucent card slides in from bottom-right when the first `token` arrives. Footer: "**3 agents · 7 chunks activated**" with hoverable chips that highlight the corresponding nodes. Click a chip → opens the wiki page in a new tab.

**Ambient muting during chat** — while a chat is active, ambient pulses are dampened to ~10% opacity to keep the visual focused. They restore on `done`.

**Ephemeral mode in `/api/chat`** — the route accepts a `surface: 'pulse' | 'chat'` parameter validated by zod. When `surface === 'pulse'`, the route skips writes to `conversations` and `chat_messages`. This is a small but real change to the existing chat route, called out so reviewers can audit the persistence-skip path.

## Error handling

| Failure | Behavior |
|---|---|
| `/api/pulse/layout` errors | Page renders with empty graph; brain backdrop still shows; banner: "Loading neural graph…"; auto-retry once after 3s |
| SSE `/api/pulse/stream` disconnects | Auto-reconnect with exp. backoff (2s, 4s, 8s, cap 30s). No buffer reset — frontend tracks last-seen timestamp |
| `activated` event references unknown pageTitle | Silently ignored. Likely indicates layout is stale; trigger a soft refetch of `/api/pulse/layout` |
| WebGL not supported | Static fallback: render a plain HTML page that links to `/chat` with a short "your browser doesn't support this view" message |
| MW recent-changes poll fails | Logged; activityWatcher sleeps 60s then retries. SSE clients see no events but no error |
| Embedding miss for a chat query (rare) | Existing router behavior — fall back to first agent; emit a minimal `activated` event with that one agent so the UI doesn't sit blank |

## Testing strategy

- `layoutBuilder.test.ts` — pure-function: feed synthetic embeddings + brain mask, assert all output points are in-mask, similar inputs produce nearby outputs, and seeding is deterministic.
- `edgeBuilder.test.ts` — assert top-K + threshold filtering produces the expected sparse graph for a small fixture.
- `brainMask.test.ts` — point-in-polygon correctness on known inside/outside points (incl. boundary edge cases).
- `activityWatcher.test.ts` — fake MW client + fake `LISTEN`; assert ring buffer dedupes by `rcid` and SSE fanout delivers events in order.
- `/api/chat` integration: assert the new SSE event types fire in the right order using a stubbed router.
- `/api/chat` ephemeral path: assert `surface: 'pulse'` skips writes to `conversations` and `chat_messages` (regression guard for the persistence-skip).
- Frontend: visual regression is hard with WebGL — we settle for a Playwright test that loads `/pulse`, sends a question, and asserts (via DOM probes on the response card and Pixi's accessibility layer) that ≥1 node enters the "activated" state. No pixel snapshots.

## Risks

1. **UMAP cold-start cost** — first hit on a fresh process takes ~1s for hundreds of nodes. Mitigation: warm the cache during `instrumentation.ts` startup, and serve a stable JSON snapshot from disk if available.
2. **Brain mask drift** — if `brain.png` is ever regenerated, `brainMask.json` must be retraced. Documented in `lib/pulse/README.md`.
3. **Aesthetic mismatch** — gpt-image output may not blend with the dark theme on the first try. Plan: budget two regenerations with refined prompts. Acceptance is a designer-eye check, not an automated test.
4. **`/api/chat` ephemeral mode** — a new code path that skips DB writes. Mitigation: a single zod-validated `surface` parameter, branching only at the persistence step, plus an explicit regression test (see Testing).

## Out of scope (for v1)

- Hover-to-see-page-title labels and click-to-open-wiki on nodes. (Stretch — the user picked "Everything at once" as v1, which excluded this stretch.)
- Time-lapse replay slider showing growth over the last 30 days.
- Mobile / touch interactions.
- Real-time presence indicators (e.g., "X people viewing").
- Customizable brain skins / themes.

## Open questions

None at this point. All design decisions are captured in the **Decisions** table above.
