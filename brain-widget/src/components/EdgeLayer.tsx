// brain-widget/src/components/EdgeLayer.tsx
// Adapted from chat-service/src/components/pulse/EdgeLayer.tsx
// Changes: removed 'use client', local types import, no Tailwind dependency.

import { Container, Graphics } from 'pixi.js';
import { extend } from '@pixi/react';
import type { PulseLayout } from '../types';

extend({ Container, Graphics });

interface Props {
  layout: PulseLayout;
  size: { w: number; h: number };
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
  travelingDotPhase?: number; // 0..1, animates 0→1 looped while LLM is generating
}

export default function EdgeLayer({ layout, size, activated, travelingDotPhase = 0 }: Props) {
  const stageSize = Math.min(size.w, size.h) * 0.9;
  const place = (x: number, y: number) => ({
    x: (x - 0.5) * stageSize,
    y: (y - 0.5) * stageSize,
  });

  const positions = new Map(layout.nodes.map(n => [n.pageTitle, place(n.x, n.y)]));

  // An edge is "active" if both endpoints are in the activated set, or one
  // endpoint is the selected agent.
  const isActiveEdge = (sourceTitle: string, targetTitle: string) => {
    const sel = activated.selected;
    return (
      (sel && (sourceTitle === sel || targetTitle === sel)) ||
      (activated.agents.has(sourceTitle) && activated.agents.has(targetTitle)) ||
      (activated.knowledge.has(targetTitle) && (sel === sourceTitle || activated.agents.has(sourceTitle)))
    );
  };

  return (
    <pixiContainer>
      <pixiGraphics
        draw={g => {
          g.clear();
          for (const e of layout.edges) {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) continue;
            const active = isActiveEdge(e.source, e.target);
            const color = active ? 0xffb86b : 0xffffff;
            const alpha = active ? 0.7 : 0.08;
            const width = active ? 1.2 : 0.5;
            g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width, alpha });
            if (active && travelingDotPhase > 0) {
              const t = travelingDotPhase;
              const dx = a.x + (b.x - a.x) * t;
              const dy = a.y + (b.y - a.y) * t;
              g.circle(dx, dy, 2.5).fill({ color: 0xffd9a0, alpha: 0.9 });
            }
          }
        }}
      />
    </pixiContainer>
  );
}
