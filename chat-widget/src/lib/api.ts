import type { ChatSession, ChatMessage } from '../types';

let chatServiceUrl = '';

export function configure(url: string) {
  chatServiceUrl = url.replace(/\/$/, '');
}

export async function createSession(agentPageTitle: string): Promise<ChatSession> {
  const res = await fetch(`${chatServiceUrl}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ agent_page_title: agentPageTitle }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function sendMessage(sessionId: string, content: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${chatServiceUrl}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
