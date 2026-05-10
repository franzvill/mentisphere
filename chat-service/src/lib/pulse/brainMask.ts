export interface Point { x: number; y: number }

// Even-odd ray-casting. Boundary cases are intentionally implementation-defined.
export function isInside(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Project (x, y) onto the closest point on the polygon boundary, then return
// that projection. (Geometric: each segment has a closest point; pick min.)
export function nearestInsidePoint(x: number, y: number, polygon: Point[]): Point {
  if (isInside(x, y, polygon)) return { x, y };

  let bestDist = Infinity;
  let best: Point = polygon[0];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    const projected = projectOntoSegment({ x, y }, a, b);
    const d = (projected.x - x) ** 2 + (projected.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = projected;
    }
  }
  return best;
}

function projectOntoSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// Loaded at runtime by callers — see Task 19 (brainMask.json generation).
import maskData from './brainMask.json' with { type: 'json' };

export const BRAIN_MASK: Point[] = maskData as Point[];
