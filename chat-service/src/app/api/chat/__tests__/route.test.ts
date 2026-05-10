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
