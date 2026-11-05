import { CANVAS_PRESETS, type ScreenFrameSize } from '@presentation/editor/renderer/ScreenFrame';

export const SNAP_GRID = 8;

/** Nothing throws geometry errors like a zero-pixel component. */
export const MIN_NODE_SIZE = { w: 24, h: 16 } as const;

export type EditorDevice = keyof typeof CANVAS_PRESETS;

export function snapValue(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

export function snapOrRaw(value: number, isSnapEnabled: boolean): number {
  return isSnapEnabled ? snapValue(value) : Math.round(value);
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/** Keeps a box entirely inside its viewport, honoring minimum sizes first. */
export function clampNodeToBounds(
  box: { x: number; y: number; w: number; h: number },
  bounds: ScreenFrameSize,
  min: { w: number; h: number } = MIN_NODE_SIZE,
): { x: number; y: number; w: number; h: number } {
  const w = clamp(Math.max(box.w, min.w), min.w, bounds.width);
  const h = clamp(Math.max(box.h, min.h), min.h, bounds.height);
  return {
    x: clamp(box.x, 0, bounds.width - w),
    y: clamp(box.y, 0, bounds.height - h),
    w,
    h,
  };
}

/** device -> design-space viewport. */
export function deviceViewport(device: EditorDevice): ScreenFrameSize {
  return CANVAS_PRESETS[device];
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * Pure resize math: which edge a handle drags, scaled deltas, snap, minimum
 * sizes, and bounds clamping all live here so canvas code stays declarative.
 */
export function resizeFromHandle(
  start: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  delta: { x: number; y: number },
  options: { isSnapEnabled: boolean; bounds: ScreenFrameSize },
): { x: number; y: number; w: number; h: number } {
  const dx = snapOrRaw(delta.x, options.isSnapEnabled);
  const dy = snapOrRaw(delta.y, options.isSnapEnabled);
  const movesWest = handle === 'nw' || handle === 'sw' || handle === 'w';
  const movesEast = handle === 'ne' || handle === 'se' || handle === 'e';
  const movesNorth = handle === 'nw' || handle === 'ne' || handle === 'n';
  const movesSouth = handle === 'sw' || handle === 'se' || handle === 's';

  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  if (movesWest) {
    const westLimit = start.x + start.w - MIN_NODE_SIZE.w;
    x = Math.min(start.x + dx, westLimit);
    w = start.x + start.w - x;
  } else if (movesEast) {
    w = Math.max(start.w + dx, MIN_NODE_SIZE.w);
  }

  if (movesNorth) {
    const northLimit = start.y + start.h - MIN_NODE_SIZE.h;
    y = Math.min(start.y + dy, northLimit);
    h = start.y + start.h - y;
  } else if (movesSouth) {
    h = Math.max(start.h + dy, MIN_NODE_SIZE.h);
  }

  // Deltas were snapped already; snapping edge positions again would wobble
  // boxes whose origin sits between grid lines (100 -> 88 at the 10.5 point).
  return clampNodeToBounds({ x, y, w, h }, options.bounds);
}
