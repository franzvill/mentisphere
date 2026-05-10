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
