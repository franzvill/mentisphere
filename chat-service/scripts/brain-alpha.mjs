// One-shot: read public/brain.png, convert near-black pixels to transparent
// alpha, write the result back. The gpt-image-2 model renders the brain on a
// solid black background; once alpha-keyed it composites cleanly over any
// page color (no need for canvas-level blend hacks).

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brainPath = resolve(__dirname, '..', 'public', 'brain.png');

const png = PNG.sync.read(readFileSync(brainPath));
const { width, height, data } = png;

// Lower bound: pixels darker than this are fully transparent.
// Upper bound: above this, fully opaque. In between we ramp alpha so the glow
// edges feather smoothly.
const FLOOR = 18;   // 0..255 luma — anything below = transparent
const CEIL  = 110;  // 0..255 luma — anything above = opaque
const span  = CEIL - FLOOR;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  let a;
  if (luma <= FLOOR) a = 0;
  else if (luma >= CEIL) a = 255;
  else a = Math.round(((luma - FLOOR) / span) * 255);
  data[i + 3] = a;
}

const out = PNG.sync.write(png);
writeFileSync(brainPath, out);
console.log(`Alpha-keyed ${brainPath} (${width}x${height})`);
