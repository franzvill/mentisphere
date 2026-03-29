import { ChatWidget } from './components/ChatWidget';
import { configure } from './lib/api';

interface Props {
  chatServiceUrl: string;
  agentPageTitle: string;
  agentName: string;
}

export function App({ chatServiceUrl, agentPageTitle, agentName }: Props) {
  configure(chatServiceUrl);
  return <ChatWidget agentPageTitle={agentPageTitle} agentName={agentName} />;
}
