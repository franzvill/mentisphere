// src/lib/pulse/activityWatcher.ts
import type { ActivityEvent } from './pulseTypes';
import { subscribe as subscribePg } from './pgListener';

export interface ActivityWatcherOpts {
  ringSize?: number;
  mwApiUrl?: string;
  pollIntervalMs?: number;
}

export class ActivityWatcher {
  private ring: ActivityEvent[] = [];
  private listeners = new Set<(ev: ActivityEvent) => void>();
  private seenRcid = new Set<number>();
  private ringSize: number;
  private mwApiUrl?: string;
  private pollMs: number;
  private pollTimer?: NodeJS.Timeout;
  private pgUnsub?: () => void;

  constructor(opts: ActivityWatcherOpts = {}) {
    this.ringSize = opts.ringSize ?? 100;
    this.mwApiUrl = opts.mwApiUrl;
    this.pollMs = opts.pollIntervalMs ?? 15_000;
  }

  start() {
    this.pgUnsub = subscribePg(ev => this.push(ev));
    if (this.mwApiUrl) {
      this.pollTimer = setInterval(() => this.pollMW().catch(console.warn), this.pollMs);
    }
  }

  stop() {
    this.pgUnsub?.();
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  push(ev: ActivityEvent) {
    if ((ev.type === 'edit' || ev.type === 'spawn') && this.seenRcid.has(ev.rcid)) return;
    if (ev.type === 'edit' || ev.type === 'spawn') this.seenRcid.add(ev.rcid);

    this.ring.push(ev);
    if (this.ring.length > this.ringSize) this.ring.shift();
    for (const l of this.listeners) l(ev);
  }

  snapshot(): ActivityEvent[] {
    return [...this.ring];
  }

  subscribe(listener: (ev: ActivityEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async pollMW() {
    if (!this.mwApiUrl) return;
    const url = new URL(this.mwApiUrl);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'recentchanges');
    url.searchParams.set('rcnamespace', '3000|3010|3020'); // Agent, Knowledge, Skill
    url.searchParams.set('rcprop', 'title|ids|timestamp|flags');
    url.searchParams.set('rclimit', '20');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MW poll ${res.status}`);
    const data: any = await res.json();
    const changes = data?.query?.recentchanges ?? [];
    for (const rc of changes) {
      this.push({
        type: rc.new ? 'spawn' : 'edit',
        pageTitle: rc.title,
        rcid: rc.rcid,
        ts: Date.parse(rc.timestamp),
      });
    }
  }
}

// Module-scoped singleton, started lazily on first import from a route handler.
let singleton: ActivityWatcher | null = null;

export function getActivityWatcher(): ActivityWatcher {
  if (!singleton) {
    singleton = new ActivityWatcher({
      mwApiUrl: process.env.MEDIAWIKI_API_URL,
    });
    singleton.start();
  }
  return singleton;
}
