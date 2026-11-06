export function PreviewZoomControls({
  zoom,
  min = 0.25,
  max = 2,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  zoom: number;
  min?: number;
  max?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  const canZoomOut = zoom > min + 1e-9;
  const canZoomIn = zoom < max - 1e-9;
  const percent = Math.round(zoom * 100);

  return (
    <div
      aria-label="Preview zoom"
      className="flex items-center gap-1 rounded-full border border-hairline bg-surface p-0.5 shadow-md"
      role="group"
    >
      <button
        aria-label="Zoom out preview"
        className="rounded-full px-2 py-1 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canZoomOut}
        onClick={onZoomOut}
        type="button"
      >
        −
      </button>
      <span aria-live="polite" className="min-w-10 text-center text-xs font-semibold text-ink" data-testid="preview-zoom-value">
        {percent}%
      </span>
      <button
        aria-label="Zoom in preview"
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
    </div>
  );
}