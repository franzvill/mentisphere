// brain-widget/src/App.tsx
// Top-level orchestration: fetches layout + ambient activity, renders BrainCanvas.
// Self-contained — no Tailwind dependency; styles live in styles.css.

import { useEffect, useRef, useState } from 'react';
import type { PulseLayout, ActivityEvent } from './types';
import BrainCanvas from './components/BrainCanvas';

const CHAT_SERVICE_URL =
  (window as any).mw?.config?.get('wgMentiSphereChatServiceUrl') ?? '/chat-api';

const EMPTY_LAYOUT: PulseLayout = { nodes: [], edges: [], version: '' };

const EMPTY_ACTIVATED = {
  agents: new Set<string>(),
  knowledge: new Set<string>(),
  selected: null,
};

export function App() {
  const [layout, setLayout] = useState<PulseLayout>(EMPTY_LAYOUT);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const evtRef = useRef<EventSource | null>(null);

  // Fetch layout once on mount
  useEffect(() => {
    fetch(`${CHAT_SERVICE_URL}/api/pulse/layout`)
      .then(r => {
        if (!r.ok) throw new Error(`layout ${r.status}`);
        return r.json() as Promise<PulseLayout>;
      })
      .then(data => {
        setLayout(data);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  // Subscribe to ambient activity stream
  useEffect(() => {
    const es = new EventSource(`${CHAT_SERVICE_URL}/api/pulse/stream`);
    evtRef.current = es;

    es.onmessage = e => {
      try {
        const ev = JSON.parse(e.data) as ActivityEvent;
        setActivity(prev => [...prev.slice(-49), ev]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE reconnects automatically; no action needed.
    };

    return () => {
      es.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="ms-brain-widget">
        <div className="ms-brain-widget__loading">Loading neural graph&hellip;</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ms-brain-widget">
        <div className="ms-brain-widget__error">Could not load brain visualization.</div>
      </div>
    );
  }

  return (
    <div className="ms-brain-widget">
      <div className="ms-brain-widget__canvas-wrap">
        <BrainCanvas
          layout={layout}
          activity={activity}
          activated={EMPTY_ACTIVATED}
          travelingDotPhase={0}
        />
      </div>
      <div className="ms-brain-widget__footer">
        <a href="/pulse" className="ms-brain-widget__link">
          Ask the mind &rarr;
        </a>
      </div>
    </div>
  );
}
