import { getPageContent, extractSystemPrompt } from '@/lib/mediawiki/client';
import { retrieveRelevantChunks } from '@/lib/rag/retrieval';
import { getLLMProvider } from '@/lib/llm/provider';
import type { LLMProviderType } from '@/lib/llm/types';
import { db } from '@/db';
import { skillRegistry } from '@/db/schema';
import { ChatGraphState } from './state';

export async function agentNode(state: typeof ChatGraphState.State) {
  if (!state.selectedAgent) {
    return { response: "I'm sorry, I couldn't find an appropriate agent to help with your question." };
  }

  // Load agent prompt from MediaWiki
  const page = await getPageContent(state.selectedAgent);
  if (!page) {
    return { response: "The selected agent could not be loaded. Please try again." };
  }
  const systemPrompt = extractSystemPrompt(page.wikitext);

  // RAG: retrieve relevant knowledge
  let knowledgeContext: string | null = null;
  try {
    const chunks = await retrieveRelevantChunks(state.userMessage, 5);
    if (chunks.length > 0) {
      knowledgeContext = chunks.map(c => `[${c.pageTitle}]\n${c.chunkText}`).join('\n\n---\n\n');
    }
  } catch (e) {
    console.warn('[RAG] Retrieval failed:', e);
  }

  // Skills: build catalog
  let skillCatalog = '';
  const allSkills = await db.query.skillRegistry.findMany();
  if (allSkills.length > 0) {
    skillCatalog = '\n\n---\nAvailable Skills (if a skill would help answer the user, respond ONLY with [USE_SKILL: Skill:Page_Name] and nothing else):\n'
      + allSkills.map(s => `- ${s.pageTitle} — ${s.description}`).join('\n');
  }

  const systemPromptFinal = systemPrompt + skillCatalog;

  // Build messages
  const messages = [
    ...state.conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: state.userMessage },
  ];

  // First LLM call (collect, don't stream — check for skill invocation)
  const provider = getLLMProvider(
    (state.llmProvider as LLMProviderType) || undefined,
    state.llmKey || undefined,
    state.llmModel || undefined,
  );
  let firstResponse = '';
  for await (const event of provider.stream({
    systemPrompt: systemPromptFinal,
    messages,
    knowledgeContext: knowledgeContext || undefined,
  })) {
    if (event.type === 'text' && event.text) {
      firstResponse += event.text;
    }
  }

  // Check for skill invocation
  const skillMatch = firstResponse.match(/\[USE_SKILL:\s*(Skill:[^\]]+)\]/);
  if (skillMatch) {
    const skillTitle = skillMatch[1].trim();
    const skillPage = await getPageContent(skillTitle);
    if (skillPage) {
      const skillContent = extractSystemPrompt(skillPage.wikitext);
      let skillResponse = '';
      for await (const event of provider.stream({
        systemPrompt,
        messages,
        skillInstructions: `You are now using the skill "${skillTitle}". Follow these instructions precisely. Do NOT respond with [USE_SKILL]. Generate the actual content.\n\n${skillContent}`,
        knowledgeContext: knowledgeContext || undefined,
      })) {
        if (event.type === 'text' && event.text) {
          skillResponse += event.text;
        }
      }
      return { response: skillResponse, systemPrompt, knowledgeContext, skillCatalog };
    }
  }

  return { response: firstResponse, systemPrompt, knowledgeContext, skillCatalog };
}
