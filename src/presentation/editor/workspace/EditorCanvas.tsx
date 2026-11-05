import {
  useEffect,
  useRef,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { ComponentNode, ComponentType } from '@domain/entities/componentNode';
import type { Screen } from '@domain/entities/screen';
import { ScreenFrame } from '../renderer/ScreenFrame';
import { SNAP_GRID, deviceViewport, snapOrRaw, type EditorDevice } from '../state/geometry';
import { ZOOM_LIMITS } from '../state/editorState';
import { COMPONENT_MIME } from './ComponentsPalette';
import { SelectionOverlay } from './SelectionOverlay';
import { ZoomPill } from './ZoomPill';

/** Padding around the device frame inside the scrollable stage. */
export const CANVAS_PAD_PX = 48;
/** Pointer travel (screen px) before a press counts as a drag, not a click. */
const DRAG_THRESHOLD_PX = 4;

const COMPONENT_TYPES: readonly ComponentType[] = ['button', 'text', 'input', 'image', 'container', 'list'];

function isComponentType(value: string): value is ComponentType {
  return (COMPONENT_TYPES as readonly string[]).includes(value);
}

interface EditorCanvasProps {
  screen: Screen;
  device: EditorDevice;
  zoom: number;
  isSnapEnabled: boolean;
  selectedNodeId: string | null;
  dropIndicator: { x: number; y: number } | null;
  onSelectNode: (nodeId: string | null) => void;
  /** Pushes one undo history entry when a drag session actually starts. */
  onDragStart: () => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeResize: (nodeId: string, geometry: { x: number; y: number; w: number; h: number }) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onAddBehavior: () => void;
  onDropAt: (nodeType: ComponentType, x: number, y: number) => void;
  onDropIndicatorChange: (position: { x: number; y: number } | null) => void;
  onZoomChange: (zoom: number) => void;
  onToggleSnap: () => void;
}

interface InteractionTarget {
  node: ComponentNode;
  /** Screen-space position (top-level nodes: same as relative coords). */
  absX: number;
  absY: number;
}

/**
 * Walks the node tree accumulating absolute screen-space positions. Container
 * children carry coordinates relative to their parent, so nested targets get
 * parent offset added while keeping their own relative values for move math.
 */
function flattenInteractionTargets(
  nodes: readonly ComponentNode[],
  originX: number,
  originY: number,
): InteractionTarget[] {
  const targets: InteractionTarget[] = [];
  for (const node of nodes) {
    const absX = originX + node.x;
    const absY = originY + node.y;
    targets.push({ node, absX, absY });
    if (node.type === 'container') {
      targets.push(...flattenInteractionTargets(node.children, absX, absY));
    }
  }
  return targets;
}

interface DragSession {
  nodeId: string;
  startClientX: number;
  startClientY: number;
  /** Node position at pointerdown, in the node's own coordinate space. */
  nodeStartX: number;
  nodeStartY: number;
  isDragging: boolean;
}

/**
 * The design canvas: device frame with the live screen, a transparent
 * interaction layer where nodes are selected and dragged, palette drop
 * handling with a snap indicator, the selection overlay, and zoom controls.
 */
export function EditorCanvas({
  screen,
  device,
  zoom,
  isSnapEnabled,
  selectedNodeId,
  dropIndicator,
  onSelectNode,
  onDragStart,
  onNodeMove,
  onNodeResize,
  onDuplicateSelected,
  onDeleteSelected,
  onAddBehavior,
  onDropAt,
  onDropIndicatorChange,
  onZoomChange,
  onToggleSnap,
}: EditorCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);

  const bounds = deviceViewport(device);
  const targets = flattenInteractionTargets(screen.nodes, 0, 0);
  const frameWidth = bounds.width * zoom;
  const frameHeight = bounds.height * zoom;
  const topLevelNode = selectedNodeId
    ? screen.nodes.find((node) => node.id === selectedNodeId)
    : undefined;

  function computeFittedZoom(): number | null {
    const viewport = viewportRef.current;
    if (!viewport) {
      return null;
    }
    const availableWidth = viewport.clientWidth - CANVAS_PAD_PX * 2;
    const availableHeight = viewport.clientHeight - CANVAS_PAD_PX * 2;
    const scaleX = availableWidth > 0 ? availableWidth / bounds.width : 1;
    const scaleY = availableHeight > 0 ? availableHeight / bounds.height : 1;
    return Number(
      Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, Math.min(scaleX, scaleY))).toFixed(2),
    );
  }

  function toDesignPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = interactionLayerRef.current?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0)) / zoom,
      y: (clientY - (rect?.top ?? 0)) / zoom,
    };
  }

  // Refit once per device change, not on every render (a manual zoom must stick).
  const lastFitDeviceRef = useRef<EditorDevice | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    if (lastFitDeviceRef.current === device) {
      return;
    }
    lastFitDeviceRef.current = device;
    const fittedZoom = computeFittedZoom();
    if (fittedZoom !== null && Math.abs(fittedZoom - zoomRef.current) >= 0.01) {
      onZoomChange(fittedZoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  function capturePointer(event: ReactPointerEvent<HTMLElement>): void {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture unavailable in this environment; window listeners carry the drag */
    }
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      onSelectNode(null);
    }
  }

  function beginNodeInteraction(event: ReactPointerEvent<HTMLDivElement>, target: InteractionTarget): void {
    event.stopPropagation();
    dragSessionRef.current = {
      nodeId: target.node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      nodeStartX: target.node.x,
      nodeStartY: target.node.y,
      isDragging: false,
    };
    capturePointer(event);

    function handleMove(moveEvent: PointerEvent): void {
      const session = dragSessionRef.current;
      if (session === null || session.nodeId !== target.node.id) {
        return;
      }
      const totalDx = moveEvent.clientX - session.startClientX;
      const totalDy = moveEvent.clientY - session.startClientY;
      if (!session.isDragging) {
        if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) {
          return;
        }
        session.isDragging = true;
        onDragStart();
      }
      onNodeMove(session.nodeId, session.nodeStartX + totalDx / zoom, session.nodeStartY + totalDy / zoom);
    }

    function detach(): void {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleFinish);
      window.removeEventListener('pointercancel', handleCancel);
    }

    function handleFinish(): void {
      const session = dragSessionRef.current;
      detach();
      if (session !== null && !session.isDragging) {
        // A press without travel is a click: select (history untouched).
        onSelectNode(session.nodeId);
      }
      dragSessionRef.current = null;
    }

    function handleCancel(): void {
      detach();
      dragSessionRef.current = null;
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleFinish);
    window.addEventListener('pointercancel', handleCancel);
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes(COMPONENT_MIME)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const point = toDesignPoint(event.clientX, event.clientY);
    onDropIndicatorChange({
      x: snapOrRaw(point.x, isSnapEnabled),
      y: snapOrRaw(point.y, isSnapEnabled),
    });
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>): void {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    onDropIndicatorChange(null);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>): void {
    event.preventDefault();
    onDropIndicatorChange(null);
    if (!event.dataTransfer.types.includes(COMPONENT_MIME)) {
      return;
    }
    const nodeType = event.dataTransfer.getData(COMPONENT_MIME);
    if (!isComponentType(nodeType)) {
      return;
    }
    const point = toDesignPoint(event.clientX, event.clientY);
    onDropAt(nodeType, snapOrRaw(point.x, isSnapEnabled), snapOrRaw(point.y, isSnapEnabled));
  }

  return (
    <section aria-label="Design canvas" className="relative min-h-0 flex-1">
      <div ref={viewportRef} className="h-full w-full overflow-auto">
        <div
          className="flex w-fit min-w-full justify-center p-12"
          data-testid="canvas-stage"
          style={{
            backgroundSize: `${SNAP_GRID * zoom}px ${SNAP_GRID * zoom}px`,
            backgroundImage: isSnapEnabled
              ? 'radial-gradient(circle, rgba(100, 116, 139, 0.35) 1px, transparent 1px)'
              : undefined,
          }}
        >
          <div
            className="relative shrink-0 border border-hairline bg-surface shadow-sm"
            data-testid="canvas-frame"
            style={{ height: frameHeight, width: frameWidth }}
          >
            <ScreenFrame
              mode="canvas"
              scale={zoom}
              screen={screen}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              size={bounds}
            />

            <div
              className="absolute inset-0"
              data-testid="canvas-interactions"
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPointerDown={handleBackgroundPointerDown}
              ref={interactionLayerRef}
            >
              {targets.map(({ node, absX, absY }) => (
                <div
                  className="absolute cursor-move"
                  data-testid={`interaction-${node.id}`}
                  key={node.id}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => beginNodeInteraction(event, { node, absX, absY })}
                  style={{
                    height: node.h * zoom,
                    left: absX * zoom,
                    top: absY * zoom,
                    width: node.w * zoom,
                  }}
                />
              ))}

              {dropIndicator ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 border-l-2 border-dashed border-brand-600"
                  data-testid="drop-indicator"
                  style={{ height: frameHeight, left: dropIndicator.x * zoom }}
                />
              ) : null}

              {topLevelNode ? (
                <SelectionOverlay
                  device={device}
                  geometry={topLevelNode}
                  isSnapEnabled={isSnapEnabled}
                  onAddBehavior={onAddBehavior}
                  onDelete={onDeleteSelected}
                  onDuplicate={onDuplicateSelected}
                  onResize={(geometry) => onNodeResize(topLevelNode.id, geometry)}
                  zoom={zoom}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <ZoomPill
          isSnapEnabled={isSnapEnabled}
          onFit={() => {
            const fittedZoom = computeFittedZoom();
            if (fittedZoom !== null) {
              onZoomChange(fittedZoom);
            }
          }}
          onToggleSnap={onToggleSnap}
          onZoomIn={() => onZoomChange(zoom + ZOOM_LIMITS.step)}
          onZoomOut={() => onZoomChange(zoom - ZOOM_LIMITS.step)}
          zoom={zoom}
        />
      </div>
    </section>
  );
}
