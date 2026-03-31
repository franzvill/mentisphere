import { useEffect, useState } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AgentInfoBar } from './AgentInfoBar';
import { LLMSettingsWidget } from './LLMSettingsWidget';
import { useChat } from '../hooks/use-chat';

interface Props {
  agentPageTitle: string;
  agentName: string;
}

export function ChatWidget({ agentPageTitle, agentName }: Props) {
  const { messages, isStreaming, error, sendMessage } = useChat(agentPageTitle);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="ms-chat-widget">
      <AgentInfoBar
        agentName={agentName}
        agentPageTitle={agentPageTitle}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error && <div className="ms-error">{error}</div>}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
      <LLMSettingsWidget isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
