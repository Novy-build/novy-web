import { describe, expect, it } from 'vitest';
import {
  ALIGNMENT_THRESHOLD,
  computeAlignment,
  computeDistanceIndicators,
  type AlignmentRect,
} from './alignment';

/** Target parked far away on the other axis so only x alignment is tested. */
function farOnY(overrides: Partial<AlignmentRect>): AlignmentRect {
  return { x: 0, y: 600, w: 40, h: 20, ...overrides };
}

describe('computeAlignment', () => {
  it('snaps the left edge to a sibling edge within the threshold', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 104 });

    const result = computeAlignment(moving, [target]);

    expect(result.x).toBe(104);
    expect(result.y).toBe(100);
    expect(result.guides).toHaveLength(1);
    expect(result.guides[0]).toMatchObject({ axis: 'x', position: 104, kind: 'edge' });
  });

  it('snaps the centre of the moving rect to a sibling centre', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 128, w: 50 });

    const result = computeAlignment(moving, [target]);

    expect(result.x).toBe(103);
    expect(result.guides[0]).toMatchObject({ axis: 'x', position: 153, kind: 'center' });
  });

  it('snaps the right edge to a target right edge', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 143, w: 60 });

    const result = computeAlignment(moving, [target]);

    expect(result.x).toBe(103);
    expect(result.guides[0]).toMatchObject({ position: 203, kind: 'edge' });
  });

  it('snaps the top and bottom edges on the vertical axis', () => {
    const moving: AlignmentRect = { x: 400, y: 100, w: 100, h: 40 };
    const target: AlignmentRect = { x: 0, y: 103, w: 40, h: 20 };

    const result = computeAlignment(moving, [target]);

    expect(result.y).toBe(103);
    expect(result.guides[0]).toMatchObject({ axis: 'y', position: 103, kind: 'edge' });
  });

  it('does not snap once the delta exceeds the threshold', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 100 + ALIGNMENT_THRESHOLD + 1, w: 4 });

    const result = computeAlignment(moving, [target]);

    expect(result.x).toBe(100);
    expect(result.guides).toHaveLength(0);
  });

  it('honours a custom threshold used for zoom-aware tolerance', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 104 });

    expect(computeAlignment(moving, [target], { threshold: 2 }).x).toBe(100);
    expect(computeAlignment(moving, [target], { threshold: 5 }).x).toBe(104);
  });

  it('reports guides without moving when snapping is disabled', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 104 });

    const result = computeAlignment(moving, [target], { snap: false });

    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.guides).toHaveLength(1);
    expect(result.guides[0].position).toBe(104);
  });

  it('spans the guide across both rectangles', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const target = farOnY({ x: 104, y: 200, h: 60 });

    const result = computeAlignment(moving, [target]);

    expect(result.guides[0]).toMatchObject({ start: 100, end: 260 });
  });

  it('merges duplicate guides for targets sharing the same coordinate', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const first = farOnY({ x: 103, y: 300 });
    const second: AlignmentRect = { x: 103, y: 500, w: 80, h: 20 };

    const result = computeAlignment(moving, [first, second]);

    expect(result.x).toBe(103);
    expect(result.guides.filter((guide) => guide.axis === 'x')).toHaveLength(1);
  });

  it('picks the closest match per axis', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };
    const near = farOnY({ x: 102 });
    const far = farOnY({ x: 105 });

    expect(computeAlignment(moving, [far, near]).x).toBe(102);
  });

  it('aligns against the frame rect when it is passed as a target', () => {
    const moving: AlignmentRect = { x: 1235, y: 100, w: 100, h: 40 };
    const frame: AlignmentRect = { x: 0, y: 0, w: 1340, h: 800 };

    expect(computeAlignment(moving, [frame]).x).toBe(1240);
  });

  it('ignores degenerate target rects and empty target lists', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 100, h: 40 };

    expect(computeAlignment(moving, []).guides).toHaveLength(0);
    expect(computeAlignment(moving, [{ x: 100, y: 100, w: 0, h: 0 }]).x).toBe(100);
  });
});

describe('computeDistanceIndicators', () => {
  it('measures a horizontal gap where component heights overlap', () => {
    const result = computeDistanceIndicators(
      { x: 100, y: 100, w: 50, h: 40 },
      [{ x: 190, y: 110, w: 30, h: 20 }],
    );

    expect(result).toEqual([
      { axis: 'x', start: 150, end: 190, position: 120, distance: 40 },
    ]);
  });

  it('measures a vertical gap where component widths overlap', () => {
    const result = computeDistanceIndicators(
      { x: 100, y: 200, w: 80, h: 40 },
      [{ x: 120, y: 100, w: 30, h: 50 }],
    );

    expect(result).toEqual([
      { axis: 'y', start: 150, end: 200, position: 135, distance: 50 },
    ]);
  });

  it('returns only the nearest measurable gap on each axis', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 40, h: 40 };
    const result = computeDistanceIndicators(moving, [
      { x: 200, y: 100, w: 20, h: 20 },
      { x: 160, y: 110, w: 20, h: 20 },
      { x: 110, y: 200, w: 20, h: 20 },
      { x: 120, y: 170, w: 20, h: 20 },
    ]);

    expect(result).toMatchObject([
      { axis: 'x', distance: 20 },
      { axis: 'y', distance: 30 },
    ]);
  });

  it('does not measure diagonal or overlapping components', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 40, h: 40 };

    expect(computeDistanceIndicators(moving, [
      { x: 200, y: 200, w: 20, h: 20 },
      { x: 110, y: 110, w: 20, h: 20 },
    ])).toEqual([]);
  });

  it('ignores degenerate targets', () => {
    const moving: AlignmentRect = { x: 100, y: 100, w: 40, h: 40 };

    expect(computeDistanceIndicators(moving, [{ x: 200, y: 100, w: 0, h: 20 }])).toEqual([]);
  });
});
