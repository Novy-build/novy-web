import type { DistanceIndicator } from '../state/alignment';

export interface DistanceIndicatorsProps {
  indicators: readonly DistanceIndicator[];
  zoom: number;
}

/** Draws zoom-aware component-gap lines while keeping their labels legible. */
export function DistanceIndicators({ indicators, zoom }: DistanceIndicatorsProps) {
  if (indicators.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30"
      data-testid="distance-indicators"
    >
      {indicators.map((indicator) => {
        const length = Math.max(0, (indicator.end - indicator.start) * zoom);
        const style = indicator.axis === 'x'
          ? {
              height: 1,
              left: indicator.start * zoom,
              top: indicator.position * zoom,
              width: length,
            }
          : {
              height: length,
              left: indicator.position * zoom,
              top: indicator.start * zoom,
              width: 1,
            };
        const markerClass = indicator.axis === 'x'
          ? 'absolute -top-0.5 h-1.5 w-px bg-guide'
          : 'absolute -left-0.5 h-px w-1.5 bg-guide';
        const labelStyle = indicator.axis === 'x'
          ? { left: '50%', top: 0 }
          : { left: 0, top: '50%' };

        return (
          <div
            className="absolute bg-guide"
            data-distance-axis={indicator.axis}
            data-testid="distance-indicator"
            key={indicator.axis}
            style={style}
          >
            <span className={markerClass} style={{ left: indicator.axis === 'x' ? 0 : undefined, top: indicator.axis === 'y' ? 0 : undefined }} />
            <span className={markerClass} style={{ right: indicator.axis === 'x' ? 0 : undefined, bottom: indicator.axis === 'y' ? 0 : undefined }} />
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-guide px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-guide-ink shadow-sm"
              data-testid="distance-label"
              style={labelStyle}
            >
              {Math.round(indicator.distance)} px
            </span>
          </div>
        );
      })}
    </div>
  );
}
