import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AgentInfoBar } from './AgentInfoBar';
import { useChat } from '../hooks/use-chat';

interface Props {
  agentPageTitle: string;
  agentName: string;
}

export function ChatWidget({ agentPageTitle, agentName }: Props) {
  const { messages, isStreaming, error, sendMessage } = useChat(agentPageTitle);

  return (
    <div className="ms-chat-widget">
      <AgentInfoBar agentName={agentName} agentPageTitle={agentPageTitle} />
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error && <div className="ms-error">{error}</div>}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
