import { ChatWidget } from './components/ChatWidget';
import { SignInPromptWidget } from './components/SignInPromptWidget';
import { configure } from './lib/api';

interface Props {
  chatServiceUrl: string;
  agentPageTitle: string;
  agentName: string;
  isAuthed: boolean;
}

export function App({ chatServiceUrl, agentPageTitle, agentName, isAuthed }: Props) {
  configure(chatServiceUrl);
  if (!isAuthed) {
    return <SignInPromptWidget agentPageTitle={agentPageTitle} agentName={agentName} />;
  }
  return <ChatWidget agentPageTitle={agentPageTitle} agentName={agentName} />;
}
