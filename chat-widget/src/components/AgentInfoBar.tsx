interface Props {
  agentName: string;
  agentPageTitle: string;
  onOpenSettings?: () => void;
}

export function AgentInfoBar({ agentName, agentPageTitle, onOpenSettings }: Props) {
  const wikiUrl = `/wiki/${agentPageTitle}`;
  return (
    <div className="ms-agent-bar">
      <strong>{agentName}</strong>
      <div className="ms-agent-bar-actions">
        {onOpenSettings && (
          <button className="ms-agent-bar-settings" onClick={onOpenSettings} title="LLM Settings">
            &#x2699;
          </button>
        )}
        <a href={wikiUrl} target="_top">View Source</a>
      </div>
    </div>
  );
}
