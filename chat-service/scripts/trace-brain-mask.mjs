// chat-service/scripts/trace-brain-mask.mjs
//
// Traces the largest connected dark region in public/brain.png and writes
// its convex hull as a polygon to src/lib/pulse/brainMask.json.
//
// "Largest dark region" = pixels with average luminance > threshold (the
// brain itself glows; everything else is near-black).

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const inPath = resolve(root, 'public/brain.png');
const outPath = resolve(root, 'src/lib/pulse/brainMask.json');

const png = PNG.sync.read(readFileSync(inPath));
const { width, height, data } = png;
const LUMA_THRESHOLD = 50; // 0..255

const points = [];
const STEP = 8; // sample every 8 pixels for speed
for (let y = 0; y < height; y += STEP) {
  for (let x = 0; x < width; x += STEP) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 100) continue; // ignore transparent
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma > LUMA_THRESHOLD) points.push([x / width, y / height]);
  }
}
if (!points.length) {
  console.error('No bright pixels found — adjust LUMA_THRESHOLD.');
  process.exit(1);
}

// Convex hull (Andrew's monotone chain) — gives a smooth, convex polygon.
points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const lower = [];
for (const p of points) {
  while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
  lower.push(p);
}
const upper = [];
for (let i = points.length - 1; i >= 0; i--) {
  const p = points[i];
  while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
  upper.push(p);
}
const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
const polygon = hull.map(([x, y]) => ({ x, y }));

writeFileSync(outPath, JSON.stringify(polygon, null, 0));
console.log(`Wrote ${polygon.length} polygon points to ${outPath}`);
