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
