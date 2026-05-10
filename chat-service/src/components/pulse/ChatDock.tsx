// src/components/pulse/ChatDock.tsx
'use client';

import { useState, FormEvent } from 'react';

interface Props {
  onSubmit: (q: string) => void;
  busy: boolean;
}

export default function ChatDock({ onSubmit, busy }: Props) {
  const [v, setV] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.trim() || busy) return;
    onSubmit(v.trim());
    setV('');
  };

  return (
    <form
      onSubmit={submit}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[44%] min-w-[420px] max-w-[640px]
                 backdrop-blur bg-white/5 border border-white/10 rounded-full
                 flex items-center gap-3 px-5 py-3"
    >
      <input
        autoFocus
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder={busy ? 'Thinking…' : 'Ask the mind anything…'}
        disabled={busy}
        className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
      />
      <button
        type="submit"
        disabled={busy || !v.trim()}
        className="text-xs uppercase tracking-wider text-zinc-300 disabled:text-zinc-600"
      >
        Ask
      </button>
    </form>
  );
}
