import OpenAI from 'openai';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { generateEmbedding } from '@/lib/rag/embeddings';
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
  const client = new OpenAI();
  const agentList = candidates.map(a => `- ${a.title}: ${a.name} — ${a.description}`).join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 100,
    messages: [
      {
        role: 'system',
        content: `You are a routing assistant. Given a user message, pick the most appropriate agent. Respond with ONLY the agent page title (e.g., "Agent:Medical_Triage"), nothing else.\n\nAvailable agents:\n${agentList}`,
      },
      { role: 'user', content: state.userMessage },
    ],
  });

  const picked = response.choices[0]?.message?.content?.trim() || candidates[0].title;
  const valid = candidates.find(a => a.title === picked);
  return { selectedAgent: valid ? picked : candidates[0].title };
}

// Export for use by the search API
export { findRelevantAgents };
