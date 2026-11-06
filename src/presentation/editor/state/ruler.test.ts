import { describe, expect, it } from 'vitest';
import {
  RULER_MIN_LABEL_GAP_PX,
  RULER_MIN_TICK_GAP_PX,
  RULER_STEPS,
  RULER_THICKNESS,
  rulerMetrics,
  rulerStep,
} from './ruler';

describe('rulerStep', () => {
  it('keeps minor ticks at least the minimum gap apart on screen', () => {
    for (const zoom of [0.5, 0.75, 1, 1.25, 2]) {
      expect(rulerStep(zoom) * zoom).toBeGreaterThanOrEqual(RULER_MIN_TICK_GAP_PX);
    }
  });

  it('picks a wider step as the canvas zooms out', () => {
    expect(rulerStep(2)).toBe(5);
    expect(rulerStep(1)).toBe(10);
    expect(rulerStep(0.5)).toBe(20);
  });

  it('snaps to the nice-number ladder', () => {
    for (const zoom of [0.5, 1, 1.3, 2]) {
      expect(RULER_STEPS).toContain(rulerStep(zoom));
    }
  });

  it('falls back to a usable scale for invalid zoom values', () => {
    expect(rulerStep(0)).toBe(rulerStep(1));
    expect(rulerStep(Number.NaN)).toBe(rulerStep(1));
  });
});

describe('rulerMetrics', () => {
  it('walks the whole length with labelled major ticks', () => {
    const metrics = rulerMetrics(200, 1);

    expect(metrics.step).toBe(10);
    expect(metrics.majorStep).toBe(50);
    expect(metrics.ticks).toHaveLength(21);
    expect(metrics.ticks[0]).toEqual({ value: 0, isMajor: true });
    expect(metrics.ticks[1]).toEqual({ value: 10, isMajor: false });
    expect(metrics.labels.map((label) => label.value)).toEqual([0, 50, 100, 150, 200]);
    expect(metrics.labels.map((label) => label.text)).toEqual(['0', '50', '100', '150', '200']);
  });

  it('spaces labels by at least the minimum on-screen gap', () => {
    for (const zoom of [0.5, 1, 2]) {
      const metrics = rulerMetrics(1200, zoom);
      expect(metrics.majorStep * zoom).toBeGreaterThanOrEqual(RULER_MIN_LABEL_GAP_PX);
    }
  });

  it('doubles the label interval when even the largest ladder step is too dense', () => {
    const metrics = rulerMetrics(10_000, 0.01);

    expect(metrics.step).toBe(500);
    expect(metrics.majorStep).toBe(5000);
  });

  it('returns no ticks for an empty or invalid length', () => {
    expect(rulerMetrics(0, 1).ticks).toHaveLength(0);
    expect(rulerMetrics(Number.NaN, 1).labels).toHaveLength(0);
  });

  it('exposes a stable ruler thickness for layout', () => {
    expect(RULER_THICKNESS).toBeGreaterThan(0);
  });
});
