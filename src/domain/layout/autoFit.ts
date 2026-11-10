/**
 * Pure placement math for fit-once component drops.
 *
 * The editor stores concrete pixel geometry. These helpers calculate the
 * geometry a widget should receive when it is first placed in a parent, so a
 * palette drop or reparent cannot overflow its padded content box. They do not
 * implement continuous flex layout; parent resizes never re-run this fit.
 */

export const MIN_NODE_SIZE = { w: 24, h: 16 } as const;

export interface FitSize {
  w: number;
  h: number;
}

export interface FitContentSize {
  width: number;
  height: number;
}

export interface MainAxisItem {
  id: string;
  size: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Caps a widget size to the available content box. Smaller widgets keep their
 * intrinsic size; the minimum node size wins when the parent is smaller than a
 * usable control.
 */
export function fitSizeToContent(
  size: FitSize,
  content: FitContentSize,
  min: FitSize = MIN_NODE_SIZE,
): FitSize {
  const minWidth = Math.max(1, finiteOr(min.w, MIN_NODE_SIZE.w));
  const minHeight = Math.max(1, finiteOr(min.h, MIN_NODE_SIZE.h));
  const maxWidth = Number.isFinite(content.width)
    ? Math.max(minWidth, content.width)
    : Number.POSITIVE_INFINITY;
  const maxHeight = Number.isFinite(content.height)
    ? Math.max(minHeight, content.height)
    : Number.POSITIVE_INFINITY;

  return {
    w: Math.max(minWidth, Math.min(Math.max(minWidth, finiteOr(size.w, minWidth)), maxWidth)),
    h: Math.max(minHeight, Math.min(Math.max(minHeight, finiteOr(size.h, minHeight)), maxHeight)),
  };
}

/**
 * Fits a Row/Column's visible children along its main axis. When their desired
 * sizes plus gaps exceed the available extent, siblings shrink proportionally
 * while every child keeps at least `minSize` pixels. If the minimums cannot fit,
 * the minimum sizes are returned and the unavoidable overflow remains.
 */
export function fitMainAxisSizes(
  items: readonly MainAxisItem[],
  available: number,
  gap: number,
  minSize: number = MIN_NODE_SIZE.w,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  if (items.length === 0) {
    return result;
  }

  const minimum = Math.max(1, finiteOr(minSize, MIN_NODE_SIZE.w));
  const safeGap = Math.max(0, finiteOr(gap, 0));
  const childBudget = Math.max(
    0,
    finiteOr(available, 0) - safeGap * Math.max(0, items.length - 1),
  );
  const desired = items.map((item) => ({
    id: item.id,
    size: Math.max(minimum, finiteOr(item.size, minimum)),
  }));
  const desiredTotal = desired.reduce((total, item) => total + item.size, 0);

  if (desiredTotal <= childBudget) {
    for (const item of desired) {
      result.set(item.id, item.size);
    }
    return result;
  }

  if (minimum * items.length >= childBudget) {
    for (const item of desired) {
      result.set(item.id, minimum);
    }
    return result;
  }

  let remainingBudget = childBudget;
  let pool = desired;
  while (pool.length > 0) {
    const poolTotal = pool.reduce((total, item) => total + item.size, 0);
    const factor = remainingBudget / poolTotal;
    const forced = pool.filter((item) => item.size * factor <= minimum);

    if (forced.length === 0) {
      for (const item of pool) {
        result.set(item.id, Math.max(minimum, Math.floor(item.size * factor)));
      }
      break;
    }

    for (const item of forced) {
      result.set(item.id, minimum);
      remainingBudget -= minimum;
    }
    const forcedIds = new Set(forced.map((item) => item.id));
    pool = pool.filter((item) => !forcedIds.has(item.id));
  }

  return result;
}
