// src/app/api/pulse/stream/route.ts
import { NextRequest } from 'next/server';
import { getActivityWatcher } from '@/lib/pulse/activityWatcher';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const watcher = getActivityWatcher();
  const encoder = new TextEncoder();

  // Cleanup is closed-over by both `start` (which assigns it) and `cancel`
  // (which invokes it). Don't stash it on the controller — `this` inside the
  // ReadableStream's `cancel` callback is the source object, not the controller,
  // so a controller-attached property would be unreachable and subscribers
  // would leak on every client disconnect.
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Replay buffer first so the page never looks dead.
      for (const ev of watcher.snapshot()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }

      const unsub = watcher.subscribe(ev => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          // Stream closed; cleanup() handles teardown.
        }
      });

      // Heartbeat every 25s to keep the connection alive through proxies.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      cleanup = () => {
        unsub();
        clearInterval(heartbeat);
      };
    },
    cancel() {
      // Next.js calls cancel on client disconnect.
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
