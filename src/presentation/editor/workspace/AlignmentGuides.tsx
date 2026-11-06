import type { AlignmentGuide } from '../state/alignment';

export interface AlignmentGuidesProps {
  guides: readonly AlignmentGuide[];
  zoom: number;
}

/**
 * Overlay of smart-guide lines for the active drag. Positions arrive in
 * design-space units and are scaled to screen pixels here. Purely visual:
 * `pointer-events-none` keeps the interaction layer clickable underneath.
 */
export function AlignmentGuides({ guides, zoom }: AlignmentGuidesProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30"
      data-testid="alignment-guides"
    >
      {guides.map((guide, index) => {
        const style = guide.axis === 'x'
          ? {
              height: Math.max(0, (guide.end - guide.start) * zoom),
              left: guide.position * zoom,
              top: guide.start * zoom,
              width: 1,
            }
          : {
              height: 1,
              left: guide.start * zoom,
              top: guide.position * zoom,
              width: Math.max(0, (guide.end - guide.start) * zoom),
            };

        return (
          <div
            className="absolute bg-guide"
            data-guide-axis={guide.axis}
            data-guide-kind={guide.kind}
            data-testid="alignment-guide"
            key={`${guide.axis}-${guide.position}-${index}`}
            style={style}
          />
        );
      })}
    </div>
  );
}
