import { describe, it, expect } from 'vitest';
import { isInside, nearestInsidePoint } from '../brainMask';

// A simple square mask for testing: [(0.2,0.2), (0.8,0.2), (0.8,0.8), (0.2,0.8)]
const square = [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 },
  { x: 0.2, y: 0.8 },
];

describe('isInside', () => {
  it('returns true for clearly inside points', () => {
    expect(isInside(0.5, 0.5, square)).toBe(true);
  });
  it('returns false for clearly outside points', () => {
    expect(isInside(0.0, 0.0, square)).toBe(false);
    expect(isInside(0.9, 0.5, square)).toBe(false);
  });
  it('handles boundary edges deterministically', () => {
    // ray-casting: a point on the boundary may resolve either way; we just
    // require the function returns a stable boolean (no NaN / undefined).
    const result = isInside(0.2, 0.5, square);
    expect(typeof result).toBe('boolean');
  });
});

describe('nearestInsidePoint', () => {
  it('returns the same point if already inside', () => {
    expect(nearestInsidePoint(0.5, 0.5, square)).toEqual({ x: 0.5, y: 0.5 });
  });
  it('snaps an outside point to the closest boundary edge', () => {
    const result = nearestInsidePoint(0.0, 0.5, square);
    expect(result.y).toBeCloseTo(0.5, 5);
    expect(result.x).toBeCloseTo(0.2, 5);
  });
  it('snaps a corner-outside point to the nearest corner', () => {
    const result = nearestInsidePoint(0.0, 0.0, square);
    expect(result.x).toBeCloseTo(0.2, 5);
    expect(result.y).toBeCloseTo(0.2, 5);
  });
});
