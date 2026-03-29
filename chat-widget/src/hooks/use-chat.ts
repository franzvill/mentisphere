import { useState, useCallback, useRef } from 'react';
import { createSession, sendMessage as apiSendMessage } from '../lib/api';
import type { ChatMessage, StreamEvent } from '../types';

export function useChat(agentPageTitle: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (!sessionIdRef.current) {
      const session = await createSession(agentPageTitle);
      sessionIdRef.current = session.session_id;
    }
    return sessionIdRef.current;
  }, [agentPageTitle]);

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    setIsStreaming(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }]);

    try {
      const sessionId = await ensureSession();
      const stream = await apiSendMessage(sessionId, content);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6)) as StreamEvent;

          if (data.type === 'text' && data.text) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + data.text }
                : m
            ));
          } else if (data.type === 'done' && data.message_id) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, id: data.message_id! } : m
            ));
          } else if (data.type === 'error') {
            setError(data.error || 'Unknown error');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsStreaming(false);
    }
  }, [ensureSession]);

  return { messages, isStreaming, error, sendMessage };
}
