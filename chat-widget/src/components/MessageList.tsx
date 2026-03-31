import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { StreamingIndicator } from './StreamingIndicator';
import type { ChatMessage as MessageType } from '../types';

interface Props {
  messages: MessageType[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div className="ms-message-list" ref={listRef}>
      {messages.length === 0 && (
        <div className="ms-empty">Ask this agent anything.</div>
      )}
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
