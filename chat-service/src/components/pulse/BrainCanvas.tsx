// src/components/pulse/BrainCanvas.tsx
'use client';

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Texture, Assets } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '@/lib/pulse/pulseTypes';
import NodeLayer from './NodeLayer';
import EdgeLayer from './EdgeLayer';

// Must be at module scope so pixi* JSX tags are registered before any render.
extend({ Container, Sprite });

interface Props {
  layout: PulseLayout;
  activity: ActivityEvent[];
  activated: { agents: Set<string>; knowledge: Set<string>; selected: string | null };
  travelingDotPhase?: number;
}

export default function BrainCanvas({ layout, activity, activated, travelingDotPhase = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [brainTex, setBrainTex] = useState<Texture | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    Assets.load('/brain.png').then((t: Texture) => setBrainTex(t));
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const onClick = (title: string) => {
    window.open(`/wiki/${encodeURIComponent(title)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      onMouseMove={e => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      {size.w > 0 && (
        <Application width={size.w} height={size.h} background={0x05070d} antialias>
          <pixiContainer x={size.w / 2} y={size.h / 2}>
            {brainTex && (
              <pixiSprite
                texture={brainTex}
                anchor={0.5}
                width={Math.min(size.w, size.h) * 0.9}
                height={Math.min(size.w, size.h) * 0.9}
                alpha={0.9}
              />
            )}
            <EdgeLayer layout={layout} size={size} activated={activated} travelingDotPhase={travelingDotPhase} />
            <NodeLayer
              layout={layout}
              size={size}
              activity={activity}
              activated={activated}
              onNodeHover={setHoveredTitle}
              onNodeClick={onClick}
            />
          </pixiContainer>
        </Application>
      )}
      {hoveredTitle && (
        <div
          className="absolute pointer-events-none px-2 py-1 text-xs text-zinc-100
                     bg-zinc-900/90 backdrop-blur border border-white/10 rounded
                     font-mono whitespace-nowrap shadow-lg"
          style={{
            left: mouse.x + 14,
            top: mouse.y + 14,
            // Avoid covering the right edge — flip to the left of the cursor.
            transform: mouse.x > size.w - 240 ? 'translateX(-100%) translateX(-28px)' : undefined,
          }}
        >
          {hoveredTitle}
        </div>
      )}
    </div>
  );
}
