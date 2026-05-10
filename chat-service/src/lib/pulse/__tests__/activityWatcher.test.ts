import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityWatcher } from '../activityWatcher';
import type { ActivityEvent } from '../pulseTypes';

describe('ActivityWatcher', () => {
  let watcher: ActivityWatcher;

  beforeEach(() => {
    watcher = new ActivityWatcher({ ringSize: 5 });
  });

  it('keeps only the last N events in the ring buffer', () => {
    for (let i = 0; i < 10; i++) {
      watcher.push({ type: 'edit', pageTitle: `P${i}`, rcid: i, ts: i });
    }
    const snap = watcher.snapshot();
    expect(snap.length).toBe(5);
    const first = snap[0];
    if (first.type !== 'edit' && first.type !== 'spawn') throw new Error('expected edit/spawn');
    expect(first.rcid).toBe(5);
  });

  it('dedupes edit events by rcid', () => {
    watcher.push({ type: 'edit', pageTitle: 'P', rcid: 1, ts: 1 });
    watcher.push({ type: 'edit', pageTitle: 'P', rcid: 1, ts: 2 });
    expect(watcher.snapshot().length).toBe(1);
  });

  it('broadcasts new events to subscribers', () => {
    const seen: ActivityEvent[] = [];
    const unsub = watcher.subscribe(ev => seen.push(ev));
    watcher.push({ type: 'chat', agentPageTitle: 'Agent:X', ts: 1 });
    expect(seen.length).toBe(1);
    unsub();
    watcher.push({ type: 'chat', agentPageTitle: 'Agent:Y', ts: 2 });
    expect(seen.length).toBe(1); // unsubscribed
  });
});
