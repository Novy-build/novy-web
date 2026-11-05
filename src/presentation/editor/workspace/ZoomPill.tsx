import { ZOOM_LIMITS } from '../state/editorState';

interface ZoomPillProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  isSnapEnabled: boolean;
  onToggleSnap: () => void;
}

/**
 * Canvas zoom controls floating bottom-left: stepper, percent readout, Fit,
 * and the snap-grid toggle that drives the dotted background.
 */
export function ZoomPill({ zoom, onZoomIn, onZoomOut, onFit, isSnapEnabled, onToggleSnap }: ZoomPillProps) {
  const percent = Math.round(zoom * 100);
  const canZoomOut = zoom > ZOOM_LIMITS.min;
  const canZoomIn = zoom < ZOOM_LIMITS.max;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-full border border-hairline bg-surface px-2 py-1 shadow-md">
      <button
        aria-label="Zoom out"
        className="rounded-full px-2 py-1 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canZoomOut}
        onClick={onZoomOut}
        type="button"
      >
        −
      </button>
      <span aria-live="polite" className="min-w-11 text-center text-xs font-semibold text-ink">
        {percent}%
      </span>
      <button
        aria-label="Zoom in"
        className="rounded-full px-2 py-1 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canZoomIn}
        onClick={onZoomIn}
        type="button"
      >
        +
      </button>
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-hairline" />
      <button
        className="rounded-full px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
        onClick={onFit}
        type="button"
      >
        Fit
      </button>
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-hairline" />
      <button
        aria-pressed={isSnapEnabled}
        className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
          isSnapEnabled ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-canvas hover:text-ink'
        }`}
        onClick={onToggleSnap}
        type="button"
      >
        Snap
      </button>
    </div>
  );
}
