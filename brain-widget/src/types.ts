// Shared types — copied from chat-service/src/lib/pulse/pulseTypes.ts
// Do NOT import from chat-service's source tree; keep this widget self-contained.

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
