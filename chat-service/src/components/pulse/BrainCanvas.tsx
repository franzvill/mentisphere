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
}

export default function BrainCanvas({ layout, activity, activated }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [brainTex, setBrainTex] = useState<Texture | null>(null);

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

  return (
    <div ref={ref} className="absolute inset-0">
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
            <EdgeLayer layout={layout} size={size} activated={activated} />
            <NodeLayer layout={layout} size={size} activity={activity} activated={activated} />
          </pixiContainer>
        </Application>
      )}
    </div>
  );
}
