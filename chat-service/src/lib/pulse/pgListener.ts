// src/lib/pulse/pgListener.ts
import { sqlClient } from '@/db';
import type { ActivityEvent } from './pulseTypes';

type Listener = (ev: ActivityEvent) => void;

const listeners = new Set<Listener>();
let started = false;

export function subscribe(listener: Listener): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function ensureStarted() {
  if (started) return;
  started = true;
  sqlClient.listen('pulse_activity', payload => {
    try {
      const ev = JSON.parse(payload) as ActivityEvent;
      for (const l of listeners) l(ev);
    } catch (e) {
      console.warn('[pulseActivity] bad payload', e);
    }
  });
}

// For tests
export function _resetForTesting() {
  started = false;
  listeners.clear();
}
