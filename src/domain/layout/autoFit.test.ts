import { describe, expect, it } from 'vitest';
import {
  MIN_NODE_SIZE,
  fitMainAxisSizes,
  fitSizeToContent,
} from './autoFit';

describe('fitSizeToContent', () => {
  it('keeps an intrinsic size that already fits', () => {
    expect(fitSizeToContent({ w: 160, h: 44 }, { width: 320, height: 240 })).toEqual({
      w: 160,
      h: 44,
    });
  });

  it('shrinks each axis to the padded parent content box', () => {
    expect(fitSizeToContent({ w: 480, h: 300 }, { width: 296, height: 180 })).toEqual({
      w: 296,
      h: 180,
    });
  });

  it('never goes below the minimum node size', () => {
    expect(fitSizeToContent({ w: 100, h: 100 }, { width: 8, height: 4 })).toEqual(MIN_NODE_SIZE);
  });

  it('leaves an infinite axis unconstrained', () => {
    expect(fitSizeToContent(
      { w: 200, h: 600 },
      { width: 200, height: Number.POSITIVE_INFINITY },
    )).toEqual({ w: 200, h: 600 });
  });
});

describe('fitMainAxisSizes', () => {
  it('leaves children untouched when their desired sizes fit', () => {
    const sizes = fitMainAxisSizes(
      [{ id: 'a', size: 160 }, { id: 'b', size: 80 }],
      260,
      12,
    );

    expect(sizes.get('a')).toBe(160);
    expect(sizes.get('b')).toBe(80);
  });

  it('shrinks siblings proportionally after subtracting gaps', () => {
    const sizes = fitMainAxisSizes(
      [{ id: 'input', size: 260 }, { id: 'button', size: 160 }],
      276,
      12,
    );

    expect(sizes.get('input')).toBe(163);
    expect(sizes.get('button')).toBe(100);
    expect((sizes.get('input') ?? 0) + (sizes.get('button') ?? 0) + 12).toBeLessThanOrEqual(276);
  });

  it('honors the minimum size before distributing the remaining budget', () => {
    const sizes = fitMainAxisSizes(
      [{ id: 'wide', size: 1000 }, { id: 'narrow', size: 10 }],
      100,
      0,
    );

    expect(sizes.get('narrow')).toBe(MIN_NODE_SIZE.w);
    expect(sizes.get('wide')).toBe(76);
  });

  it('returns minimums when gaps alone exhaust the available space', () => {
    const sizes = fitMainAxisSizes(
      [{ id: 'a', size: 100 }, { id: 'b', size: 100 }],
      20,
      24,
    );

    expect(sizes.get('a')).toBe(MIN_NODE_SIZE.w);
    expect(sizes.get('b')).toBe(MIN_NODE_SIZE.w);
  });

  it('returns an empty map for an empty layout', () => {
    expect(fitMainAxisSizes([], 320, 12).size).toBe(0);
  });
});
