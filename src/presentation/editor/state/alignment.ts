/**
 * Smart alignment math for the design canvas. Pure functions only: the canvas
 * feeds in design-space rectangles and gets back a maybe-snapped origin plus
 * the guide lines that should be drawn for the current gesture.
 *
 * Coordinates are design-space pixels (the same space nodes are stored in),
 * never screen pixels — callers divide their zoom-aware threshold first.
 */

export interface AlignmentRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AlignmentAxis = 'x' | 'y';
export type AlignmentKind = 'edge' | 'center';

export interface AlignmentGuide {
  /** 'x' draws a vertical line, 'y' draws a horizontal line. */
  axis: AlignmentAxis;
  /** Design-space coordinate of the line on its axis. */
  position: number;
  /** Extent of the line along the other axis (design space). */
  start: number;
  end: number;
  kind: AlignmentKind;
}

export interface AlignmentOptions {
  /** Maximum distance (design px) that still counts as aligned. */
  threshold?: number;
  /** When false, guides are still reported but the origin is left untouched. */
  snap?: boolean;
}

export interface AlignmentResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
}

/** Default pointer tolerance before an edge/centre snaps, in design pixels. */
export const ALIGNMENT_THRESHOLD = 6;

/** Float guard when comparing computed edge values. */
const EPSILON = 0.001;

interface AxisEdge {
  value: number;
  kind: AlignmentKind;
}

interface AxisMatch {
  /** targetValue - movingValue: the offset that would align them. */
  delta: number;
  /** Coordinate of the target edge/centre that the line is drawn on. */
  targetValue: number;
  target: AlignmentRect;
  kind: AlignmentKind;
}

function edges(rect: AlignmentRect, axis: AlignmentAxis): AxisEdge[] {
  if (axis === 'x') {
    return [
      { value: rect.x, kind: 'edge' },
      { value: rect.x + rect.w / 2, kind: 'center' },
      { value: rect.x + rect.w, kind: 'edge' },
    ];
  }
  return [
    { value: rect.y, kind: 'edge' },
    { value: rect.y + rect.h / 2, kind: 'center' },
    { value: rect.y + rect.h, kind: 'edge' },
  ];
}

function clampThreshold(threshold: number): number {
  return Number.isFinite(threshold) ? Math.max(0, threshold) : 0;
}

/**
 * Finds the smallest edge/centre delta on one axis that is within threshold.
 * Returns every target sharing that delta so duplicate guides can be merged
 * into a single line.
 */
function bestMatch(
  moving: AlignmentRect,
  targets: readonly AlignmentRect[],
  axis: AlignmentAxis,
  threshold: number,
): AxisMatch[] {
  const movingEdges = edges(moving, axis);
  let bestDelta = Number.POSITIVE_INFINITY;
  const matches: AxisMatch[] = [];

  for (const target of targets) {
    for (const targetEdge of edges(target, axis)) {
      for (const movingEdge of movingEdges) {
        const delta = targetEdge.value - movingEdge.value;
        if (Math.abs(delta) > threshold + EPSILON) {
          continue;
        }
        if (Math.abs(delta) < Math.abs(bestDelta) - EPSILON) {
          bestDelta = delta;
          matches.length = 0;
          matches.push({ delta, targetValue: targetEdge.value, target, kind: targetEdge.kind });
        } else if (Math.abs(delta - bestDelta) <= EPSILON) {
          matches.push({ delta, targetValue: targetEdge.value, target, kind: targetEdge.kind });
        }
      }
    }
  }

  return matches;
}

/**
 * One line per unique coordinate. Vertical lines span the union of the moving
 * and target heights (horizontal lines use widths), matching Figma's guides.
 */
function buildGuides(
  moving: AlignmentRect,
  matches: readonly AxisMatch[],
  axis: AlignmentAxis,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const key = `${axis}:${match.targetValue.toFixed(3)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const start = axis === 'x'
      ? Math.min(moving.y, match.target.y)
      : Math.min(moving.x, match.target.x);
    const end = axis === 'x'
      ? Math.max(moving.y + moving.h, match.target.y + match.target.h)
      : Math.max(moving.x + moving.w, match.target.x + match.target.w);

    guides.push({ axis, position: match.targetValue, start, end, kind: match.kind });
  }

  return guides;
}

/**
 * Aligns a moving rectangle against sibling rectangles and (optionally) the
 * frame. Compares left/centre/right and top/centre/bottom, picks the closest
 * match per axis, and returns guides spanning both rectangles.
 */
export function computeAlignment(
  moving: AlignmentRect,
  targets: readonly AlignmentRect[],
  options: AlignmentOptions = {},
): AlignmentResult {
  const threshold = clampThreshold(options.threshold ?? ALIGNMENT_THRESHOLD);
  const shouldSnap = options.snap ?? true;
  const usableTargets = targets.filter((target) => target.w > 0 && target.h > 0);

  if (threshold === 0 || usableTargets.length === 0) {
    return { x: moving.x, y: moving.y, guides: [] };
  }

  const xMatches = bestMatch(moving, usableTargets, 'x', threshold);
  const yMatches = bestMatch(moving, usableTargets, 'y', threshold);
  const x = shouldSnap ? moving.x + (xMatches[0]?.delta ?? 0) : moving.x;
  const y = shouldSnap ? moving.y + (yMatches[0]?.delta ?? 0) : moving.y;
  const settled: AlignmentRect = { ...moving, x, y };

  return {
    x,
    y,
    guides: [...buildGuides(settled, xMatches, 'x'), ...buildGuides(settled, yMatches, 'y')],
  };
}
