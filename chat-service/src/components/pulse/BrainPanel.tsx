'use client';

// Right-rail collapsible panel that shows the BrainCanvas alongside the chat.
// Self-contained: fetches /api/pulse/layout and subscribes to /api/pulse/stream
// on its own when expanded. The parent (Chat) drives only the `activated` state
// via the /api/chat SSE handler.

import { useEffect, useRef, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';
import BrainCanvas from './BrainCanvas';

interface Props {
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
  travelingDotPhase?: number;
}

const STORAGE_KEY = 'mentisphere:chat-brain-panel-open';

export default function BrainPanel({ activated, travelingDotPhase }: Props) {
  // Default closed; restore from localStorage if the user previously toggled it.
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<PulseLayout | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [layoutError, setLayoutError] = useState(false);
  const fetchedRef = useRef(false);

  // Hydrate persisted preference (client-only).
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'true') setOpen(true);
    } catch { /* localStorage may be unavailable in some contexts */ }
  }, []);

  // Persist on toggle.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, open ? 'true' : 'false'); } catch {}
  }, [open]);

  // Fetch layout once when the panel first opens. Skip if already fetched.
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/pulse/layout');
        if (!res.ok) { setLayoutError(true); return; }
        setLayout(await res.json());
      } catch {
        setLayoutError(true);
      }
    })();
  }, [open]);

  // Subscribe to ambient activity SSE only while open.
  useEffect(() => {
    if (!open) return;
    const es = new EventSource('/api/pulse/stream');
    es.onmessage = e => {
      try { setActivity(prev => [...prev.slice(-99), JSON.parse(e.data)]); } catch {}
    };
    return () => es.close();
  }, [open]);

  return (
    <>
      {/* Always-visible toggle rail on the right edge */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close brain panel' : 'Open brain panel'}
        className="group flex h-full w-10 shrink-0 flex-col items-center justify-center
                   border-l border-gray-200 bg-white text-[#1a237e]
                   transition-colors hover:bg-gray-50"
      >
        <span className="rotate-180 text-xl [writing-mode:vertical-rl]">🧠</span>
        <span className="mt-2 rotate-180 text-[10px] font-medium uppercase tracking-widest text-gray-500 [writing-mode:vertical-rl]">
          {open ? 'Hide' : 'Brain'}
        </span>
      </button>

      {/* Panel — animated width, dark surface for the brain, light card chrome */}
      <aside
        className={`shrink-0 overflow-hidden border-l border-gray-200 bg-black transition-[width] duration-300 ${
          open ? 'w-[400px]' : 'w-0'
        }`}
        aria-hidden={!open}
      >
        {open && (
          <div className="relative h-full w-[400px]">
            {layoutError && (
              <div className="flex h-full items-center justify-center px-6 text-center text-xs text-zinc-500">
                Couldn&apos;t load the neural graph. Try refreshing.
              </div>
            )}
            {!layout && !layoutError && (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                Loading neural graph…
              </div>
            )}
            {layout && (
              <BrainCanvas
                layout={layout}
                activity={activity}
                activated={activated}
                travelingDotPhase={travelingDotPhase}
              />
            )}

            {/* Footer: legend + node count */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-[10px] text-zinc-500">
              <div className="space-x-3 font-mono uppercase tracking-widest">
                <span>● <span className="text-orange-300">agent</span></span>
                <span>● <span className="text-sky-300">knowledge</span></span>
                <span>● <span className="text-violet-300">skill</span></span>
              </div>
              {layout && (
                <span className="font-mono">
                  {layout.nodes.length} nodes · {layout.edges.length} edges
                </span>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
