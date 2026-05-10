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
