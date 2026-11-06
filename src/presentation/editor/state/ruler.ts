/**
 * Ruler tick math for the design canvas. Canvas rulers are decorative, but the
 * spacing rules are real: ticks must stay legible at every zoom level, so the
 * step is chosen from a "nice number" ladder instead of a fixed pixel grid.
 *
 * All lengths are design-space units; callers multiply by zoom to place them.
 */

/** Thickness of the horizontal/vertical ruler strips, in screen pixels. */
export const RULER_THICKNESS = 24;

/** Minimum distance between minor ticks, in screen pixels. */
export const RULER_MIN_TICK_GAP_PX = 8;

/** Minimum distance between labelled major ticks, in screen pixels. */
export const RULER_MIN_LABEL_GAP_PX = 40;

/** Nice-number ladder used to keep tick spacing stable across zoom levels. */
export const RULER_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500] as const;

export interface RulerTick {
  /** Position along the ruler, in design-space units. */
  value: number;
  isMajor: boolean;
}

export interface RulerLabel {
  value: number;
  text: string;
}

export interface RulerMetrics {
  /** Minor tick interval in design units. */
  step: number;
  /** Labelled tick interval in design units. */
  majorStep: number;
  ticks: RulerTick[];
  labels: RulerLabel[];
}

function safeZoom(zoom: number): number {
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/** Smallest ladder step whose on-screen gap is at least the minimum. */
export function rulerStep(zoom: number): number {
  const scale = safeZoom(zoom);
  const match = RULER_STEPS.find((step) => step * scale >= RULER_MIN_TICK_GAP_PX);
  return match ?? RULER_STEPS[RULER_STEPS.length - 1];
}

/**
 * Ticks and labels for a ruler `length` design units long. Major ticks start
 * at 5× the minor step and double until labels are far enough apart.
 */
export function rulerMetrics(length: number, zoom: number): RulerMetrics {
  const scale = safeZoom(zoom);
  const step = rulerStep(scale);
  let majorStep = step * 5;
  while (majorStep * scale < RULER_MIN_LABEL_GAP_PX) {
    majorStep *= 2;
  }

  const ticks: RulerTick[] = [];
  const labels: RulerLabel[] = [];
  const extent = Number.isFinite(length) ? Math.max(0, length) : 0;

  if (extent === 0) {
    return { step, majorStep, ticks, labels };
  }

  const lastIndex = Math.floor(extent / step + 1e-9);
  for (let index = 0; index <= lastIndex; index += 1) {
    const value = Number((index * step).toFixed(4));
    const isMajor = Math.abs(value / majorStep - Math.round(value / majorStep)) < 1e-6;
    ticks.push({ value, isMajor });
    if (isMajor) {
      labels.push({ value, text: String(value) });
    }
  }

  return { step, majorStep, ticks, labels };
}
