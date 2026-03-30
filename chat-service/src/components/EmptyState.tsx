"use client";

interface EmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

const suggestions = [
  {
    label: "Assess my symptoms",
    prompt: "I have a headache and mild fever. Can you help me assess my symptoms?",
  },
  {
    label: "Help me cook dinner",
    prompt: "Help me cook a quick and healthy dinner with chicken and vegetables.",
  },
  {
    label: "Explain a complex topic",
    prompt: "Explain how the immune system works in simple terms.",
  },
  {
    label: "Create a structured report",
    prompt: "Create a structured weekly health report template I can fill in.",
  },
];

export default function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a237e]">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="2" />
          <circle cx="16" cy="16" r="4" fill="white" />
          <path
            d="M16 6V10M16 22V26M6 16H10M22 16H26"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-gray-800">
        How can I help you today?
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Choose a prompt below or type your own message.
      </p>

      {/* Suggestion cards */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onPromptClick(s.prompt)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition hover:border-[#1a237e]/30 hover:bg-[#f5f5ff]"
          >
            <span className="text-sm font-medium text-gray-800">
              {s.label}
            </span>
            <span className="mt-1 block text-xs text-gray-400 line-clamp-1">
              {s.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
