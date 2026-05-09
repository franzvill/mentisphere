import { AgentInfoBar } from './AgentInfoBar';

interface Props {
  agentPageTitle: string;
  agentName: string;
}

export function SignInPromptWidget({ agentPageTitle, agentName }: Props) {
  return (
    <div className="ms-chat-widget">
      <AgentInfoBar
        agentName={agentName}
        agentPageTitle={agentPageTitle}
        onOpenSettings={() => {}}
      />
      <div className="ms-signin-prompt">
        <p className="ms-signin-title">Sign in to chat with this agent</p>
        <p className="ms-signin-sub">
          Conversations are tied to a wiki account so you can save them and
          contribute back.
        </p>
        <div className="ms-signin-actions">
          <a
            href="/wiki/Special:UserLogin"
            className="ms-signin-btn-primary"
            style={{ color: '#fff', background: '#1a1a2e' }}
          >
            Log in
          </a>
          <a
            href="/wiki/Special:CreateAccount"
            className="ms-signin-btn-secondary"
            style={{ color: '#1a1a2e', background: 'transparent', border: '1px solid #1a1a2e' }}
          >
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}
