// src/lib/pulse/layoutCache.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PulseLayout } from './pulseTypes';

const CACHE_PATH = path.join(process.cwd(), '.cache', 'pulse', 'layout.json');

let memCache: PulseLayout | null = null;

export async function readLayout(): Promise<PulseLayout | null> {
  if (memCache) return memCache;
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    memCache = JSON.parse(raw) as PulseLayout;
    return memCache;
  } catch {
    return null;
  }
}

export async function writeLayout(layout: PulseLayout): Promise<void> {
  memCache = layout;
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(layout));
}

// For tests
export function _resetMemCache() {
  memCache = null;
}
