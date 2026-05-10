// brain-widget/src/components/NodeLayer.tsx
// Adapted from chat-service/src/components/pulse/NodeLayer.tsx
// Changes: removed 'use client', local types import, no Tailwind dependency.

import { Container, Graphics } from 'pixi.js';
import { extend } from '@pixi/react';
import type { PulseLayout, ActivityEvent } from '../types';

extend({ Container, Graphics });

interface Props {
  layout: PulseLayout;
  size: { w: number; h: number };
  activity: ActivityEvent[];
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
  onNodeHover?: (title: string | null) => void;
  onNodeClick?: (title: string) => void;
}

const COLORS = {
  agent: 0xff7a59,
  knowledge: 0x5ec1ff,
  skill: 0x9b8cff,
} as const;

export default function NodeLayer({ layout, size, activated, activity, onNodeHover, onNodeClick }: Props) {
  const stageSize = Math.min(size.w, size.h) * 0.9;

  // Translate brain-space (0..1) into stage-space (centered).
  const place = (x: number, y: number) => ({
    x: (x - 0.5) * stageSize,
    y: (y - 0.5) * stageSize,
  });

  // Map activity → pulsing pageTitles with timestamp.
  const pulses = new Map<string, number>();
  const now = Date.now();
  for (const ev of activity.slice(-20)) {
    const key = (ev as any).pageTitle ?? (ev as any).agentPageTitle;
    if (!key) continue;
    const tsMs = ev.ts * (ev.ts < 1e12 ? 1000 : 1); // accept seconds OR ms
    if (now - tsMs < 4000) pulses.set(key, tsMs);
  }

  return (
    <pixiContainer>
      {layout.nodes.map(n => {
        const { x, y } = place(n.x, n.y);
        const color = COLORS[n.kind];
        const isActiveAgent = activated.agents.has(n.pageTitle);
        const isActiveKnowledge = activated.knowledge.has(n.pageTitle);
        const isSelected = activated.selected === n.pageTitle;
        const isActive = isActiveAgent || isActiveKnowledge || isSelected;
        const radius = 3 + n.weight * 4 + (isSelected ? 3 : 0);
        const alpha = isActive ? 1 : 0.6;
        const pulseTs = pulses.get(n.pageTitle);

        // Hit area is generously sized so small nodes are still hoverable.
        const hitRadius = Math.max(radius + 6, 10);

        return (
          <pixiGraphics
            key={n.pageTitle}
            x={x}
            y={y}
            eventMode="static"
            cursor="pointer"
            onPointerOver={() => onNodeHover?.(n.pageTitle)}
            onPointerOut={() => onNodeHover?.(null)}
            onPointerTap={() => onNodeClick?.(n.pageTitle)}
            draw={g => {
              g.clear();
              // Invisible hit ring — guarantees the graphics' bounding box
              // covers `hitRadius` even when the visible glyph is small.
              g.circle(0, 0, hitRadius).fill({ color: 0x000000, alpha: 0.001 });
              // outer halo
              if (isActive) {
                g.circle(0, 0, radius + 6).fill({ color, alpha: 0.18 });
              }
              g.circle(0, 0, radius).fill({ color, alpha });
              if (isSelected) {
                g.circle(0, 0, radius + 9)
                  .stroke({ color, width: 1, alpha: 0.6 });
              }
              if (pulseTs) {
                const dt = (Date.now() - pulseTs) / 4000; // 0..1 over 4s
                const pr = radius + dt * 30;
                g.circle(0, 0, pr).stroke({ color, width: 1, alpha: 1 - dt });
              }
            }}
          />
        );
      })}
    </pixiContainer>
  );
}
