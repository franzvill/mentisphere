import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { StreamingIndicator } from './StreamingIndicator';
import type { ChatMessage as MessageType } from '../types';

interface Props {
  messages: MessageType[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="ms-message-list">
      {messages.length === 0 && (
        <div className="ms-empty">Ask this agent anything.</div>
      )}
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {isStreaming && <StreamingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
