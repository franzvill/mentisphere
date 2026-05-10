import { describe, it, expect, vi, beforeEach } from 'vitest';

// sqlClient must be callable as a tagged template literal (route does:
//   await sqlClient`SELECT pg_notify(...)`
// ) AND expose a .listen method for the subscription path.
// vi.mock factories are hoisted, so we use vi.hoisted() to define the mock
// before the factory runs.
const { sqlClientMock } = vi.hoisted(() => {
  const sqlClientMock: any = vi.fn(async () => []);
  sqlClientMock.listen = vi.fn();
  return { sqlClientMock };
});

vi.mock('@/db', () => ({
  db: {
    query: {
      conversations: { findFirst: vi.fn() },
      chatMessages: { findFirst: vi.fn(), findMany: async () => [] },
    },
    insert: () => ({ values: () => ({ returning: async () => [] }) }),
    update: () => ({ set: () => ({ where: async () => [] }) }),
  },
  sqlClient: sqlClientMock,
}));
vi.mock('@/lib/auth', () => ({ authenticateRequest: async () => ({ id: 1, name: 'tester' }) }));
vi.mock('@/graph', () => ({
  createChatGraph: () => ({
    stream: async function* () {
      yield { router: { selectedAgent: 'Agent:A', topAgentCandidates: [] } };
      yield { agent: { response: 'hi', knowledgePageTitles: [], selectedAgent: 'Agent:A' } };
    },
  }),
}));

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

  it('does not write to chatMessages or conversations when surface=pulse', { timeout: 5000 }, async () => {
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
});
