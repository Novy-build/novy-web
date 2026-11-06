import { describe, expect, it } from 'vitest';
import { CANVAS_PRESETS } from '@presentation/editor/renderer/ScreenFrame';
import {
  clamp,
  clampNodeToBounds,
  computeFitZoom,
  deviceViewport,
  resizeFromHandle,
  snapOrRaw,
  snapValue,
  usesCompactEditorChrome,
} from './geometry';

describe('snapValue / snapOrRaw', () => {
  it('snaps to the 8px grid (round-half-up at midpoints)', () => {
    expect(snapValue(23)).toBe(24);
    expect(snapValue(27)).toBe(24);
    expect(snapValue(28)).toBe(32); // 28/8 = 3.5 -> 4 -> 32
  });

  it('keeps raw values when snap is off and rounds otherwise', () => {
    expect(snapOrRaw(23.7, false)).toBe(24);
    expect(snapOrRaw(23, true)).toBe(24);
  });
});

describe('clamp / clampNodeToBounds', () => {
  it('clamps numbers into range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('enforces minimum sizes before position clamping', () => {
    const tiny = clampNodeToBounds({ x: 350, y: 100, w: 8, h: 4 }, CANVAS_PRESETS.mobile);
    expect(tiny.w).toBe(24);
    expect(tiny.h).toBe(16);
  });

  it('keeps the whole box inside the viewport', () => {
    const corner = clampNodeToBounds({ x: 900, y: 900, w: 100, h: 100 }, CANVAS_PRESETS.mobile);
    expect(corner.x).toBe(CANVAS_PRESETS.mobile.width - 100);
    expect(corner.y).toBe(CANVAS_PRESETS.mobile.height - 100);
    expect(corner.x).toBeGreaterThanOrEqual(0);
  });
});

describe('deviceViewport', () => {
  it('maps device presets from the shared frame', () => {
    expect(deviceViewport('mobile')).toEqual(CANVAS_PRESETS.mobile);
    expect(deviceViewport('tablet')).toEqual(CANVAS_PRESETS.tablet);
    expect(deviceViewport('desktop')).toEqual(CANVAS_PRESETS.desktop);
  });
});

describe('usesCompactEditorChrome', () => {
  it('collapses the editor rails for mobile and tablet frames', () => {
    expect(usesCompactEditorChrome('mobile')).toBe(true);
    expect(usesCompactEditorChrome('tablet')).toBe(true);
  });

  it('keeps both rails inline for the desktop frame', () => {
    expect(usesCompactEditorChrome('desktop')).toBe(false);
  });
});

describe('resizeFromHandle', () => {
  const start = { x: 100, y: 100, w: 80, h: 60 };
  const options = { isSnapEnabled: true, bounds: CANVAS_PRESETS.mobile };

  it('grows east and south via the se handle', () => {
    const next = resizeFromHandle(start, 'se', { x: 24, y: 16 }, options);
    expect(next).toMatchObject({ x: 100, y: 100, w: 104, h: 76 });
  });

  it('grows west: left edge moves, width compensates', () => {
    const next = resizeFromHandle(start, 'w', { x: -16, y: 0 }, options);
    expect(next).toMatchObject({ x: 84, y: 100, w: 96, h: 60 });
  });

  it('grows north: top edge moves, height compensates', () => {
    const next = resizeFromHandle(start, 'n', { x: 0, y: -16 }, options);
    expect(next).toMatchObject({ x: 100, y: 84, w: 80, h: 76 });
  });

  it('stops at minimum size instead of inverting', () => {
    const next = resizeFromHandle(start, 'w', { x: 500, y: 0 }, options);
    expect(next.w).toBe(24);
    expect(next.x).toBe(100 + 80 - 24);
  });

  it('snaps corners to the grid before clamping', () => {
    const next = resizeFromHandle(start, 'ne', { x: 7, y: -5 }, options);
    // dx snaps to 8, dy to -8
    expect(next.w).toBe(88);
    expect(next.y).toBe(92);
    expect(next.h).toBe(68);
  });

  it('keeps resized boxes inside the device bounds', () => {
    const gone = resizeFromHandle(
      { x: 0, y: 0, w: 390, h: 780 },
      'se',
      { x: 2000, y: 2000 },
      options,
    );
    expect(gone.w).toBe(CANVAS_PRESETS.mobile.width);
    expect(gone.h).toBe(CANVAS_PRESETS.mobile.height);
  });
});

describe('computeFitZoom', () => {
  it('fits a desktop frame into the available viewport', () => {
    const zoom = computeFitZoom({ clientWidth: 1000, clientHeight: 700 }, CANVAS_PRESETS.desktop, 48);
    expect(zoom).toBe(0.75);
  });

  it('clamps small viewports to the minimum zoom', () => {
    const zoom = computeFitZoom({ clientWidth: 300, clientHeight: 200 }, CANVAS_PRESETS.desktop, 48);
    expect(zoom).toBe(0.5);
  });

  it('falls back to 100% when layout is unavailable', () => {
    const zoom = computeFitZoom({ clientWidth: 0, clientHeight: 0 }, CANVAS_PRESETS.desktop, 48);
    expect(zoom).toBe(1);
  });
});
