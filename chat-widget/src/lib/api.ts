import type { ChatSession, ChatMessage } from '../types';

let chatServiceUrl = '';

export function configure(url: string) {
  chatServiceUrl = url.replace(/\/$/, '');
}

function getLLMHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const provider = localStorage.getItem('ms-llm-provider');
    const key = localStorage.getItem('ms-llm-key');
    const model = localStorage.getItem('ms-llm-model');
    if (provider && key) {
      headers['X-LLM-Provider'] = provider;
      headers['X-LLM-Key'] = key;
      if (model) headers['X-LLM-Model'] = model;
    }
  } catch {
    // localStorage may be unavailable
  }
  return headers;
}

export async function createSession(agentPageTitle: string): Promise<ChatSession> {
  const res = await fetch(`${chatServiceUrl}/sessions`, {
    method: 'POST',
    headers: getLLMHeaders(),
    credentials: 'include',
    body: JSON.stringify({ agent_page_title: agentPageTitle }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function sendMessage(sessionId: string, content: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${chatServiceUrl}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: getLLMHeaders(),
    credentials: 'include',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  if (!res.body) throw new Error('No response body');
  return res.body;
}

export async function rateMessage(messageId: string, rating: 'helpful' | 'not_helpful'): Promise<void> {
  await fetch(`${chatServiceUrl}/messages/${messageId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rating }),
  });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${chatServiceUrl}/sessions/${sessionId}/messages`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to get messages: ${res.status}`);
  const data = await res.json();
  return data.messages;
}
