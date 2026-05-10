// src/app/pulse/PulseClient.tsx
'use client';

import { useEffect, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';

interface Props { initialLayout: PulseLayout | null }

export default function PulseClient({ initialLayout }: Props) {
  const [layout, setLayout] = useState(initialLayout);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [supported, setSupported] = useState<boolean | null>(null);

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
      {/* BrainCanvas comes in Task 21 */}
      <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
        Layout v{layout.version} — {layout.nodes.length} nodes, {layout.edges.length} edges
      </div>
    </div>
  );
}
