// src/app/pulse/PulseClient.tsx
'use client';

import { useEffect, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';
import BrainCanvas from '@/components/pulse/BrainCanvas';

interface Props { initialLayout: PulseLayout | null }

export default function PulseClient({ initialLayout }: Props) {
  const [layout, setLayout] = useState(initialLayout);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [activated, setActivated] = useState<{
    agents: Set<string>;
    knowledge: Set<string>;
    selected: string | null;
  }>({
    agents: new Set(),
    knowledge: new Set(),
    selected: null,
  });

  // Suppress unused-variable warning until Task 25 wires chat events.
  void setActivated;

  // Traveling-dot phase: animates 0→1 looped at ~0.33Hz while a chat is pending.
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!pending) {
      setPhase(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const t = ((Date.now() - start) / 3000) % 1; // 3s loop
      setPhase(t);
    }, 33);
    return () => clearInterval(id);
  }, [pending]);

  // Suppress until Task 25 flips it.
  void setPending;

  // 30fps redraw tick — forces React to re-render so NodeLayer pulse rings animate.
  // Safe for ~50–100 nodes; switch to useTick if node count grows past 1000.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 33);
    return () => clearInterval(id);
  }, []);

  // WebGL feature detection — see Task 25.
  useEffect(() => {
    const c = document.createElement('canvas');
    setSupported(!!(c.getContext('webgl2') || c.getContext('webgl')));
  }, []);

  useEffect(() => {
    if (!supported) return;
    const es = new EventSource('/api/pulse/stream');
    es.onmessage = e => {
      try { setActivity(prev => [...prev.slice(-99), JSON.parse(e.data)]); } catch {}
    };
    return () => es.close();
  }, [supported]);

  if (supported === false) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-zinc-300">
        <div className="text-center">
          <p>Your browser doesn&apos;t support this view.</p>
          <a className="underline mt-4 block" href="/chat">Try /chat instead →</a>
        </div>
      </div>
    );
  }

  if (!layout) {
    return <div className="h-screen flex items-center justify-center bg-black text-zinc-400">Loading neural graph…</div>;
  }

  return (
    <div className="h-screen w-screen relative bg-black text-white overflow-hidden">
      <BrainCanvas layout={layout} activity={activity} activated={activated} travelingDotPhase={phase} />
    </div>
  );
}
