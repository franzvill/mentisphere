"use client";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onOpenLLMSettings?: () => void;
}

/** Group conversations into Today / Yesterday / Previous 7 Days / Older */
function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7Days = new Date(startOfToday);
  startOf7Days.setDate(startOf7Days.getDate() - 7);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    if (d >= startOfToday) groups[0].items.push(c);
    else if (d >= startOfYesterday) groups[1].items.push(c);
    else if (d >= startOf7Days) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function Sidebar({
  conversations,
  activeId,
  open,
  onToggle,
  onSelect,
  onNewChat,
  onOpenLLMSettings,
}: SidebarProps) {
  const groups = groupConversations(conversations);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } fixed z-30 flex h-full w-[260px] flex-col bg-[#1a1a2e] text-white transition-transform duration-200 md:relative md:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Chat
          </button>
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 transition hover:bg-white/10 md:hidden"
            aria-label="Close sidebar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 5L13 13M13 5L5 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
              {group.items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    c.id === activeId
                      ? "bg-white/15 text-white"
                      : "text-gray-300 hover:bg-white/8"
                  }`}
                >
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-gray-500">
              No conversations yet
            </p>
          )}
        </nav>

        {/* Wiki Navigation */}
        <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">Wiki</div>
          <a href="/wiki/Main_Page" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white">
            Home
          </a>
          <a href="/wiki/Special:AllPages?namespace=3000" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white">
            Browse Agents
          </a>
          <a href="/wiki/Special:AllPages?namespace=3010" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white">
            Browse Knowledge
          </a>
          <a href="/wiki/Special:RecentChanges" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white">
            Recent Changes
          </a>
        </div>

        {/* Settings */}
        {onOpenLLMSettings && (
          <div className="border-t border-white/10 px-3 py-3">
            <button
              onClick={onOpenLLMSettings}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 1.5l1.3 2.2a1 1 0 00.9.5h2.5l-1.3 2.2a1 1 0 000 1l1.3 2.2h-2.5a1 1 0 00-.9.5L10 12.3l-1.3-2.2a1 1 0 00-.9-.5H5.3l1.3-2.2a1 1 0 000-1L5.3 4.2h2.5a1 1 0 00.9-.5L10 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              LLM Settings
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
