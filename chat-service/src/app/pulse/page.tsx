// src/app/pulse/page.tsx
import { headers } from 'next/headers';
import PulseClient from './PulseClient';
import type { PulseLayout } from '@/lib/pulse/pulseTypes';

export const dynamic = 'force-dynamic';

async function fetchLayout(): Promise<PulseLayout | null> {
  const h = await headers();
  const host = h.get('host')!;
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const res = await fetch(`${proto}://${host}/api/pulse/layout`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function PulsePage() {
  const layout = await fetchLayout();
  return <PulseClient initialLayout={layout} />;
}
