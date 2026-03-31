import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateEmbedding } from '@/lib/rag/embeddings';
import type { LLMProviderType } from '@/lib/llm/types';
import { ChatGraphState } from './state';

async function findRelevantAgents(query: string, topK: number = 5) {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const result = await db.execute(
    sql`SELECT page_title, name, description,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM agent_embeddings
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}`
  );

  return (result as any[]).map(row => ({
    title: row.page_title,
    name: row.name,
    description: row.description,
    similarity: row.similarity,
  }));
}

async function routeWithLLM(
  userMessage: string,
  agentList: string,
  providerType?: LLMProviderType | null,
  apiKey?: string | null,
): Promise<string> {
  const systemContent = `You are a routing assistant. Given a user message, pick the most appropriate agent. Respond with ONLY the agent page title (e.g., "Agent:Medical_Triage"), nothing else.\n\nAvailable agents:\n${agentList}`;

  if (apiKey && providerType === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // cheapest/fastest for routing
      max_tokens: 100,
      system: systemContent,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text.trim() : '';
  }

  if (apiKey && providerType === 'gemini') {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite', // cheapest/fastest for routing
      config: { systemInstruction: systemContent },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    });
    return response.text?.trim() ?? '';
  }

  // Default: OpenAI (with optional user key)
  const client = new OpenAI(apiKey && providerType === 'openai' ? { apiKey } : undefined);
  const response = await client.chat.completions.create({
    model: 'gpt-5.4-nano', // cheapest/fastest for routing
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

export async function routerNode(state: typeof ChatGraphState.State) {
  // If conversation already has an agent, keep it
  if (state.selectedAgent) {
    return { selectedAgent: state.selectedAgent };
  }

  // Semantic search for top-5 matching agents
  const candidates = await findRelevantAgents(state.userMessage, 5);

  if (candidates.length === 0) {
    return { selectedAgent: null };
  }

  if (candidates.length === 1) {
    return { selectedAgent: candidates[0].title };
  }

  // LLM picks from the short list
  const agentList = candidates.map(a => `- ${a.title}: ${a.name} — ${a.description}`).join('\n');

  const picked = await routeWithLLM(
    state.userMessage,
    agentList,
    (state.llmProvider as LLMProviderType) || undefined,
    state.llmKey || undefined,
  );

  const valid = candidates.find(a => a.title === picked);
  return { selectedAgent: valid ? picked : candidates[0].title };
}

// Export for use by the search API
export { findRelevantAgents };
