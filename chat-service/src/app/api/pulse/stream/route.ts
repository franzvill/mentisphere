// src/app/api/pulse/stream/route.ts
import { NextRequest } from 'next/server';
import { getActivityWatcher } from '@/lib/pulse/activityWatcher';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const watcher = getActivityWatcher();
  const encoder = new TextEncoder();

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
          // Stream closed; clean up below.
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

      // Close handler
      (controller as any)._cleanup = () => {
        unsub();
        clearInterval(heartbeat);
      };
    },
    cancel(reason) {
      // Next.js calls cancel on client disconnect.
      const cleanup = (this as any)._cleanup;
      if (cleanup) cleanup();
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
