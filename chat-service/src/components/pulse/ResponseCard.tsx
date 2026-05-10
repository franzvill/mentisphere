// src/components/pulse/ResponseCard.tsx
'use client';

interface Props {
  text: string | null;
  activatedAgents: string[];
  activatedKnowledge: string[];
  onChipHover: (title: string | null) => void;
  onClose: () => void;
}

export default function ResponseCard({
  text, activatedAgents, activatedKnowledge, onChipHover, onClose,
}: Props) {
  if (!text) return null;
  return (
    <div className="absolute bottom-32 right-6 w-[34%] max-w-[420px]
                    backdrop-blur bg-zinc-900/80 border border-white/10 rounded-xl p-4
                    text-zinc-100 text-sm leading-relaxed shadow-xl">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
        {activatedAgents.length} agents · {activatedKnowledge.length} chunks activated
      </div>
      <p>{text}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {[...activatedAgents.map(t => ['agent', t] as const), ...activatedKnowledge.map(t => ['knowledge', t] as const)].map(([kind, t]) => (
          <a
            key={`${kind}:${t}`}
            href={`/wiki/${encodeURIComponent(t)}`}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => onChipHover(t)}
            onMouseLeave={() => onChipHover(null)}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              kind === 'agent' ? 'border-orange-400/40 text-orange-300' : 'border-sky-400/40 text-sky-300'
            }`}
          >
            {t}
          </a>
        ))}
      </div>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-200 text-xs"
      >×</button>
    </div>
  );
}
