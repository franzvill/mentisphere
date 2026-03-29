import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

function init() {
  const container = document.getElementById('mentisphere-chat');
  if (!container) return;

  const chatServiceUrl = (window as any).mw?.config?.get('wgMentiSphereChatServiceUrl') || '/chat-api';
  const agentPageTitle = (window as any).mw?.config?.get('wgMentiSphereAgentPage') || '';
  const agentName = agentPageTitle.replace(/^Agent:/, '').replace(/_/g, ' ');

  const root = createRoot(container);
  root.render(<App chatServiceUrl={chatServiceUrl} agentPageTitle={agentPageTitle} agentName={agentName} />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
