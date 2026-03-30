"use client";

interface AgentBadgeProps {
  agent: string;
}

export default function AgentBadge({ agent }: AgentBadgeProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-[#e8eaf6] px-2.5 py-0.5 text-xs font-medium text-[#1a237e]">
        {agent}
      </span>
      <span className="text-[11px] text-gray-400">auto-selected</span>
    </div>
  );
}
