import { useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AgentInfoBar } from './AgentInfoBar';
import { useChat } from '../hooks/use-chat';

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap';

interface Props {
  agentPageTitle: string;
  agentName: string;
}

export function ChatWidget({ agentPageTitle, agentName }: Props) {
  const { messages, isStreaming, error, sendMessage } = useChat(agentPageTitle);

  useEffect(() => {
    if (!document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="ms-chat-widget">
      <AgentInfoBar agentName={agentName} agentPageTitle={agentPageTitle} />
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error && <div className="ms-error">{error}</div>}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
