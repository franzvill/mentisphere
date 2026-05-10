// brain-widget/src/components/BrainCanvas.tsx
// Adapted from chat-service/src/components/pulse/BrainCanvas.tsx
// Changes: removed 'use client', local types import, Tailwind replaced with inline styles.

import { Application, extend } from '@pixi/react';
import { Container, Sprite, Texture, Assets } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import type { PulseLayout, ActivityEvent } from '../types';
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

const tooltipBaseStyle: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  padding: '2px 8px',
  fontSize: '11px',
  color: '#e4e4e7',
  background: 'rgba(24,24,27,0.92)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '4px',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  zIndex: 10,
};

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

  const tooltipFlip = mouse.x > size.w - 240;
  const tooltipStyle: React.CSSProperties = {
    ...tooltipBaseStyle,
    left: mouse.x + 14,
    top: mouse.y + 14,
    transform: tooltipFlip ? 'translateX(-100%) translateX(-28px)' : undefined,
  };

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', inset: 0 }}
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
        <div style={tooltipStyle}>
          {hoveredTitle}
        </div>
      )}
    </div>
  );
}
