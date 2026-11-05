import { type PointerEvent as ReactPointerEvent } from 'react';
import type { NodeGeometry } from '@domain/entities/componentNode';
import {
  RESIZE_HANDLES,
  resizeFromHandle,
  deviceViewport,
  type EditorDevice,
  type ResizeHandle,
} from '../state/geometry';

interface SelectionOverlayProps {
  geometry: NodeGeometry;
  zoom: number;
  device: EditorDevice;
  isSnapEnabled: boolean;
  onResize: (geometry: NodeGeometry) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddBehavior: () => void;
}

const HANDLE_SIZE = 10;

const HANDLE_POSITIONS: Record<ResizeHandle, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  e: { left: '100%', top: '50%' },
  se: { left: '100%', top: '100%' },
  s: { left: '50%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
};

/**
 * Solid accent outline with 8 resize handles plus a floating mini-toolbar
 * (duplicate, delete, add behavior). Resize math lives in the reducer layer;
 * this component only converts pointer deltas into design-space deltas.
 */
export function SelectionOverlay({
  geometry,
  zoom,
  device,
  isSnapEnabled,
  onResize,
  onDuplicate,
  onDelete,
  onAddBehavior,
}: SelectionOverlayProps) {
  const bounds = deviceViewport(device);

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...geometry };
    // Pointer capture keeps drags sticky, but jsdom may not implement it;
    // the window listeners below carry the drag either way.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture unavailable in this environment */
    }

    function handleMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      onResize(resizeFromHandle(start, handle, { x: dx, y: dy }, { isSnapEnabled, bounds }));
    }

    function finish() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finish);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', finish);
  }

  const scaled = {
    left: geometry.x * zoom,
    top: geometry.y * zoom,
    width: geometry.w * zoom,
    height: geometry.h * zoom,
  };
  // Flip the toolbar below the node when it hugs the top edge.
  const toolbarTop = scaled.top < 40 ? scaled.top + scaled.height + 8 : scaled.top - 36;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute border-2 border-brand-600"
        data-testid="selection-outline"
        style={scaled}
      >
        {RESIZE_HANDLES.map((handle) => (
          <button
            aria-label={`Resize ${handle}`}
            className="pointer-events-auto absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-brand-700 bg-surface"
            data-testid={`resize-handle-${handle}`}
            key={handle}
            onPointerDown={(event) => beginResize(event, handle)}
            style={{
              ...HANDLE_POSITIONS[handle],
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
            }}
            tabIndex={-1}
            type="button"
          />
        ))}
      </div>

      <div
        aria-label="Selection actions"
        className="pointer-events-auto absolute z-20 flex items-center gap-1 rounded-tile border border-hairline bg-surface px-1 py-0.5 shadow-md"
        role="group"
        style={{ left: scaled.left, top: toolbarTop }}
      >
        <OverlayAction label="Duplicate selected component" onClick={onDuplicate}>
          Duplicate
        </OverlayAction>
        <OverlayAction label="Delete selected component" onClick={onDelete} tone="danger">
          Delete
        </OverlayAction>
        <OverlayAction label="Add behavior to selected component" onClick={onAddBehavior}>
          ⚡ Behavior
        </OverlayAction>
      </div>
    </>
  );
}

function OverlayAction({
  label,
  onClick,
  tone = 'neutral',
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'danger';
  children: string;
}) {
  return (
    <button
      aria-label={label}
      className={`rounded-tile px-2 py-1 text-xs font-medium transition-colors hover:bg-canvas ${
        tone === 'danger' ? 'text-red-600 hover:text-red-700' : 'text-ink'
      }`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
