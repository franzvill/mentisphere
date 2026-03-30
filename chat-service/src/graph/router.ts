import OpenAI from 'openai';
import { getPageContent } from '@/lib/mediawiki/client';
import { ChatGraphState } from './state';

// Cache agent list (refresh every 5 minutes)
let agentCache: { title: string; description: string }[] = [];
let lastCacheTime = 0;

async function getAgentList(): Promise<{ title: string; description: string }[]> {
  if (Date.now() - lastCacheTime < 5 * 60 * 1000 && agentCache.length > 0) {
    return agentCache;
  }

  // Fetch all agent pages from MW API
  const res = await fetch(`${process.env.MEDIAWIKI_API_URL}?action=query&list=allpages&apnamespace=3000&format=json&formatversion=2`, {
    headers: { 'Host': 'localhost' },
    cache: 'no-store',
  });
  const data = await res.json();
  const pages = data.query?.allpages || [];

  const agents: { title: string; description: string }[] = [];
  for (const page of pages) {
    const content = await getPageContent(page.title);
    if (content) {
      const descMatch = content.wikitext.match(/\|\s*description\s*=\s*([^\n|}]+)/);
      const nameMatch = content.wikitext.match(/\|\s*name\s*=\s*([^\n|}]+)/);
      agents.push({
        title: page.title,
        description: `${nameMatch?.[1]?.trim() || page.title}: ${descMatch?.[1]?.trim() || 'No description'}`,
      });
    }
  }

  agentCache = agents;
  lastCacheTime = Date.now();
  return agents;
}

export async function routerNode(state: typeof ChatGraphState.State) {
  const agents = await getAgentList();

  if (agents.length === 0) {
    return { selectedAgent: null };
  }

  if (agents.length === 1) {
    return { selectedAgent: agents[0].title };
  }

  // If conversation already has an agent, check if we should keep it
  if (state.selectedAgent) {
    // For simplicity in MVP: keep the same agent within a conversation
    // unless the user explicitly asks to switch
    return { selectedAgent: state.selectedAgent };
  }

  const client = new OpenAI();
  const agentList = agents.map(a => `- ${a.title}: ${a.description}`).join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 100,
    messages: [
      {
        role: 'system',
        content: `You are a routing assistant. Given a user message, pick the most appropriate agent from the list below. Respond with ONLY the agent page title (e.g., "Agent:Medical_Triage"), nothing else.\n\nAvailable agents:\n${agentList}`,
      },
      { role: 'user', content: state.userMessage },
    ],
  });

  const picked = response.choices[0]?.message?.content?.trim() || agents[0].title;
  // Validate the picked agent exists
  const valid = agents.find(a => a.title === picked);
  return { selectedAgent: valid ? picked : agents[0].title };
}
