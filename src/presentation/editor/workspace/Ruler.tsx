import {
  RULER_THICKNESS,
  rulerMetrics,
} from '../state/ruler';

export type RulerOrientation = 'horizontal' | 'vertical';

export interface RulerProps {
  orientation: RulerOrientation;
  /** Ruler length in design-space units. */
  length: number;
  zoom: number;
  /** Pointer offset along the ruler in design-space units, or null. */
  pointer: number | null;
}

const MAJOR_TICK_PX = 10;
const MINOR_TICK_PX = 5;

/**
 * One ruler strip: gradient ticks, major labels, and a live pointer marker.
 * Purely decorative, so the whole strip is hidden from assistive tech.
 */
export function Ruler({ orientation, length, zoom, pointer }: RulerProps) {
  const isHorizontal = orientation === 'horizontal';
  const metrics = rulerMetrics(length, zoom);
  const screenLength = Math.max(0, length * zoom);

  return (
    <div
      aria-hidden="true"
      className={`relative select-none overflow-hidden border-hairline bg-surface-subtle ${
        isHorizontal ? 'border-b' : 'border-r'
      }`}
      data-orientation={orientation}
      data-testid={`ruler-${orientation}`}
      style={
        isHorizontal
          ? { height: RULER_THICKNESS, width: screenLength }
          : { height: screenLength, width: RULER_THICKNESS }
      }
    >
      {metrics.ticks.map((tick) => {
        const offset = tick.value * zoom;
        const tickLength = tick.isMajor ? MAJOR_TICK_PX : MINOR_TICK_PX;
        return (
          <span
            className="absolute bg-ink-muted opacity-40"
            data-major={tick.isMajor}
            data-testid="ruler-tick"
            key={`tick-${tick.value}`}
            style={
              isHorizontal
                ? { bottom: 0, height: tickLength, left: offset, width: 1 }
                : { height: 1, right: 0, top: offset, width: tickLength }
            }
          />
        );
      })}

      {metrics.labels.map((label) => (
        <span
          className="absolute font-mono text-[9px] leading-none text-ink-muted"
          key={`label-${label.value}`}
          style={
            isHorizontal
              ? { left: label.value * zoom + 3, top: 3 }
              : { left: 3, top: label.value * zoom + 3, writingMode: 'vertical-rl' }
          }
        >
          {label.text}
        </span>
      ))}

      {pointer !== null ? (
        <span
          className="absolute bg-brand-600"
          data-testid={`ruler-pointer-${orientation}`}
          style={
            isHorizontal
              ? { bottom: 0, left: pointer * zoom, top: 0, width: 1 }
              : { height: 1, left: 0, right: 0, top: pointer * zoom }
          }
        />
      ) : null}
    </div>
  );
}
