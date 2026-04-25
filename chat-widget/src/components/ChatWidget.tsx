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
  const {
    messages,
    isStreaming,
    error,
    needsLLMKey,
    sendMessage,
    onLLMSettingsClosed,
  } = useChat(agentPageTitle);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-open settings when the hook reports a missing key.
  useEffect(() => {
    if (needsLLMKey) setSettingsOpen(true);
  }, [needsLLMKey]);

  const handleSettingsClose = () => {
    setSettingsOpen(false);
    onLLMSettingsClosed();
  };

  const settingsReason = needsLLMKey
    ? "Add an API key to start chatting. It's stored only in this browser — never on our servers."
    : null;

  return (
    <div className="ms-chat-widget">
      <AgentInfoBar
        agentName={agentName}
        agentPageTitle={agentPageTitle}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error && (
        <div className="ms-error">
          {error.message}
          {error.kind === 'auth' && (
            <>
              {' '}
              <a href="/wiki/Special:UserLogin" className="ms-error-link">
                Log in →
              </a>
            </>
          )}
        </div>
      )}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
      <LLMSettingsWidget
        isOpen={settingsOpen}
        reason={settingsReason}
        onClose={handleSettingsClose}
      />
    </div>
  );
}
