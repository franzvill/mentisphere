interface Props {
  agentName: string;
  agentPageTitle: string;
}

export function AgentInfoBar({ agentName, agentPageTitle }: Props) {
  const wikiUrl = `/wiki/${agentPageTitle}`;
  return (
    <div className="ms-agent-bar">
      <strong>{agentName}</strong>
      <a href={wikiUrl} target="_top">View Source</a>
    </div>
  );
}
