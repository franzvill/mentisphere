import { useState, useCallback, useRef } from 'react';
import { createSession, sendMessage as apiSendMessage } from '../lib/api';
import type { ChatMessage, StreamEvent } from '../types';

export type ChatErrorKind = 'auth' | 'generic';
export interface ChatError {
  kind: ChatErrorKind;
  message: string;
}

function hasLLMKey(): boolean {
  try {
    return !!(localStorage.getItem('ms-llm-provider') && localStorage.getItem('ms-llm-key'));
  } catch {
    return false;
  }
}

export function useChat(agentPageTitle: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [needsLLMKey, setNeedsLLMKey] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (!sessionIdRef.current) {
      const session = await createSession(agentPageTitle);
      sessionIdRef.current = session.session_id;
    }
    return sessionIdRef.current;
  }, [agentPageTitle]);

  const sendMessage = useCallback(async (content: string) => {
    if (!hasLLMKey()) {
      setQueuedMessage(content);
      setNeedsLLMKey(true);
      return;
    }

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
            const errMsg = data.error || 'Unknown error';
            // Server-side "no API key" — re-prompt for key.
            if (/api key|llm settings/i.test(errMsg)) {
              setMessages(prev => prev.filter(m => m.id !== userMsg.id && m.id !== assistantId));
              setQueuedMessage(content);
              setNeedsLLMKey(true);
            } else {
              setError({ kind: 'generic', message: errMsg });
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      // The api layer throws "Failed to create session: 401" / "Failed to send message: 401".
      const isAuth = /\b401\b|\b403\b/.test(message);
      // Drop the optimistic bubbles so the error stands alone.
      setMessages(prev => prev.filter(m => m.id !== userMsg.id && m.id !== assistantId));
      setError({
        kind: isAuth ? 'auth' : 'generic',
        message: isAuth
          ? 'You need to be signed in to chat with this agent.'
          : message,
      });
    } finally {
      setIsStreaming(false);
    }
  }, [ensureSession]);

  // Called by the UI after the LLM settings modal closes; flushes queued message
  // if a key is now configured, otherwise drops the queue.
  const onLLMSettingsClosed = useCallback(() => {
    setNeedsLLMKey(false);
    if (queuedMessage && hasLLMKey()) {
      const msg = queuedMessage;
      setQueuedMessage(null);
      sendMessage(msg);
    } else if (!hasLLMKey()) {
      setQueuedMessage(null);
    }
  }, [queuedMessage, sendMessage]);

  return {
    messages,
    isStreaming,
    error,
    needsLLMKey,
    sendMessage,
    onLLMSettingsClosed,
  };
}
