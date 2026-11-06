import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type { ComponentNode, ComponentType } from '@domain/entities/componentNode';
import type { Screen } from '@domain/entities/screen';
import { findFrameAtPoint, getComponentTreeLocation, type FrameHit } from '@domain/componentTree';
import { ScreenFrame } from '../renderer/ScreenFrame';
import type { RendererDataContext } from '../renderer/renderer';
import { SNAP_GRID, ZOOM_LIMITS, computeFitZoom, deviceViewport, snapOrRaw, type EditorDevice } from '../state/geometry';
import { COMPONENT_MIME } from './ComponentsPalette';
import { SelectionOverlay } from './SelectionOverlay';
import { DeviceToggle } from './DeviceToggle';
import { ZoomPill } from './ZoomPill';
/** Padding around the device frame inside the scrollable stage. */
export const CANVAS_PAD_PX = 48;
/** Pointer travel (screen px) before a press counts as a drag, not a click. */
const DRAG_THRESHOLD_PX = 4;

const COMPONENT_TYPES: readonly ComponentType[] = [
  'button',
  'text',
  'input',
  'image',
  'container',
  'list',
  'form',
];

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
  onDropAt: (nodeType: ComponentType, x: number, y: number, parentId: string | null) => void;
  onReparentNode: (
    nodeId: string,
    parentId: string | null,
    absolutePosition: { x: number; y: number },
  ) => void;
  onDropIndicatorChange: (position: { x: number; y: number } | null) => void;
  onZoomChange: (zoom: number) => void;
  onToggleSnap: () => void;
  onDeviceChange: (device: EditorDevice) => void;
  dataContext?: RendererDataContext;
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
  ancestorLocked = false,
): InteractionTarget[] {
  const targets: InteractionTarget[] = [];
  for (const node of nodes) {
    if (node.isHidden) {
      continue;
    }
    const absX = originX + node.x;
    const absY = originY + node.y;
    const isLocked = ancestorLocked || node.isLocked === true;
    if (!isLocked) {
      targets.push({ node, absX, absY });
    }
    if (node.type === 'container') {
      targets.push(...flattenInteractionTargets(node.children, absX, absY, isLocked));
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
  targetParentId: string | null;
  startAbsoluteX: number;
  startAbsoluteY: number;
  lastAbsoluteX: number;
  lastAbsoluteY: number;
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
  onReparentNode,
  onDropIndicatorChange,
  onZoomChange,
  onToggleSnap,
  onDeviceChange,
  dataContext,
}: EditorCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const isSpacePressedRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [frameDropTarget, setFrameDropTarget] = useState<FrameHit | null>(null);

  const bounds = deviceViewport(device);
  const targets = flattenInteractionTargets(screen.nodes, 0, 0);
  const frameWidth = bounds.width * zoom;
  const frameHeight = bounds.height * zoom;
  const selectedTarget = selectedNodeId
    ? targets.find((target) => target.node.id === selectedNodeId)
    : undefined;
  const selectedLocation = selectedNodeId
    ? getComponentTreeLocation(screen.nodes, selectedNodeId)
    : null;

  function computeFittedZoom(): number | null {
    const viewport = viewportRef.current;
    if (!viewport) {
      return null;
    }
    return computeFitZoom(viewport, bounds, CANVAS_PAD_PX, ZOOM_LIMITS);
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
  const autoFitRef = useRef(true);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  function fitToViewport() {
    const fittedZoom = computeFittedZoom();
    if (fittedZoom !== null && Math.abs(fittedZoom - zoomRef.current) >= 0.01) {
      onZoomChange(fittedZoom);
    }
  }

  useEffect(() => {
    if (lastFitDeviceRef.current === device) {
      return;
    }
    lastFitDeviceRef.current = device;
    autoFitRef.current = true;
    fitToViewport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const handleResize = () => {
      if (autoFitRef.current) {
        fitToViewport();
      }
    };
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(handleResize);
      observer.observe(viewport);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      );
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        isSpacePressedRef.current = true;
      }
    }
    function handleKeyUp(event: KeyboardEvent): void {
      if (event.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      isSpacePressedRef.current = false;
    };
  }, []);

  function capturePointer(event: ReactPointerEvent<HTMLElement>): void {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture unavailable in this environment; window listeners carry the drag */
    }
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isSpacePressedRef.current && event.button !== 1 && event.target === event.currentTarget) {
      onSelectNode(null);
    }
  }

  function beginCanvasPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 1 && !isSpacePressedRef.current) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const canvasViewport = viewport;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = canvasViewport.scrollLeft;
    const startTop = canvasViewport.scrollTop;
    setIsPanning(true);

    function handleMove(moveEvent: PointerEvent): void {
      canvasViewport.scrollLeft = startLeft - (moveEvent.clientX - startX);
      canvasViewport.scrollTop = startTop - (moveEvent.clientY - startY);
    }
    function finish(): void {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      setIsPanning(false);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>): void {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    autoFitRef.current = false;
    onZoomChange(zoom + (event.deltaY < 0 ? ZOOM_LIMITS.step : -ZOOM_LIMITS.step));
  }

  function beginNodeInteraction(event: ReactPointerEvent<HTMLDivElement>, target: InteractionTarget): void {
    if (event.button === 1 || isSpacePressedRef.current) {
      return;
    }
    event.stopPropagation();
    dragSessionRef.current = {
      nodeId: target.node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      nodeStartX: target.node.x,
      nodeStartY: target.node.y,
      isDragging: false,
      targetParentId:
        getComponentTreeLocation(screen.nodes, target.node.id)?.parentId ?? null,
      startAbsoluteX: target.absX,
      startAbsoluteY: target.absY,
      lastAbsoluteX: target.absX,
      lastAbsoluteY: target.absY,
    };
    capturePointer(event);

    function handleMove(moveEvent: PointerEvent): void {
      const session = dragSessionRef.current;
      if (session === null || session.nodeId !== target.node.id) {
        return;
      }
      const totalDx = moveEvent.clientX - session.startClientX;
      const totalDy = moveEvent.clientY - session.startClientY;
      session.lastAbsoluteX = session.startAbsoluteX + totalDx / zoom;
      session.lastAbsoluteY = session.startAbsoluteY + totalDy / zoom;
      if (!session.isDragging) {
        if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) {
          return;
        }
        session.isDragging = true;
        onDragStart();
      }
      onNodeMove(session.nodeId, session.nodeStartX + totalDx / zoom, session.nodeStartY + totalDy / zoom);
      const point = toDesignPoint(moveEvent.clientX, moveEvent.clientY);
      const frame = findFrameAtPoint(screen.nodes, point.x, point.y, session.nodeId);
      session.targetParentId = frame?.id ?? null;
      setFrameDropTarget(frame);
    }

    function detach(): void {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleFinish);
      window.removeEventListener('pointercancel', handleCancel);
    }

    function handleFinish(): void {
      const session = dragSessionRef.current;
      detach();
      if (session !== null) {
        if (!session.isDragging) {
          // A press without travel is a click: select (history untouched).
          onSelectNode(session.nodeId);
        } else {
          onReparentNode(session.nodeId, session.targetParentId, {
            x: session.lastAbsoluteX,
            y: session.lastAbsoluteY,
          });
        }
      }
      dragSessionRef.current = null;
      setFrameDropTarget(null);
    }

    function handleCancel(): void {
      detach();
      dragSessionRef.current = null;
      setFrameDropTarget(null);
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
    setFrameDropTarget(findFrameAtPoint(screen.nodes, point.x, point.y));
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
    setFrameDropTarget(null);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>): void {
    event.preventDefault();
    const targetParentId = frameDropTarget?.id ?? null;
    onDropIndicatorChange(null);
    setFrameDropTarget(null);
    if (!event.dataTransfer.types.includes(COMPONENT_MIME)) {
      return;
    }
    const nodeType = event.dataTransfer.getData(COMPONENT_MIME);
    if (!isComponentType(nodeType)) {
      return;
    }
    const point = toDesignPoint(event.clientX, event.clientY);
    onDropAt(
      nodeType,
      snapOrRaw(point.x, isSnapEnabled),
      snapOrRaw(point.y, isSnapEnabled),
      targetParentId,
    );
  }

  return (
    <section aria-label="Design canvas" className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div
        className={`h-full w-full overflow-auto overscroll-contain ${isPanning ? 'cursor-grabbing select-none' : ''}`}
        data-testid="canvas-viewport"
        onPointerDown={beginCanvasPan}
        onWheel={handleCanvasWheel}
        ref={viewportRef}
      >
        <div
          className="min-h-full w-max min-w-full p-12"
          data-testid="canvas-stage"
          style={{
            backgroundSize: `${SNAP_GRID * zoom}px ${SNAP_GRID * zoom}px`,
            backgroundImage: isSnapEnabled
              ? 'radial-gradient(circle, rgba(100, 116, 139, 0.35) 1px, transparent 1px)'
              : undefined,
          }}
        >
          <div
            className="relative mx-auto shrink-0 border border-hairline bg-surface shadow-sm"
            data-testid="canvas-frame"
            style={{ height: frameHeight, width: frameWidth }}
          >
            <ScreenFrame
              mode="canvas"
              dataContext={dataContext}
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

              {frameDropTarget ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-20 rounded-tile border-2 border-brand-500 bg-brand-500/10"
                  data-testid="frame-drop-target"
                  style={{
                    height: frameDropTarget.h * zoom,
                    left: frameDropTarget.x * zoom,
                    top: frameDropTarget.y * zoom,
                    width: frameDropTarget.w * zoom,
                  }}
                />
              ) : null}

              {selectedTarget && selectedLocation ? (
                <SelectionOverlay
                  bounds={
                    selectedLocation.parentWidth && selectedLocation.parentHeight
                      ? {
                          width: selectedLocation.parentWidth,
                          height: selectedLocation.parentHeight,
                        }
                      : bounds
                  }
                  device={device}
                  geometry={selectedTarget.node}
                  isSnapEnabled={isSnapEnabled}
                  onAddBehavior={onAddBehavior}
                  onDelete={onDeleteSelected}
                  onDuplicate={onDuplicateSelected}
                  offset={{
                    x: selectedTarget.absX - selectedTarget.node.x,
                    y: selectedTarget.absY - selectedTarget.node.y,
                  }}
                  onResize={(geometry) => onNodeResize(selectedTarget.node.id, geometry)}
                  onResizeStart={onDragStart}
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
            autoFitRef.current = true;
            const fitted = computeFittedZoom();
            if (fitted !== null) {
              onZoomChange(fitted);
            }
          }}
          onToggleSnap={onToggleSnap}
          onZoomIn={() => {
            autoFitRef.current = false;
            onZoomChange(zoom + ZOOM_LIMITS.step);
          }}
          onZoomOut={() => {
            autoFitRef.current = false;
            onZoomChange(zoom - ZOOM_LIMITS.step);
          }}
          zoom={zoom}
        />
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-20">
        <div className="pointer-events-auto">
          <DeviceToggle
            label="Canvas device"
            onChange={onDeviceChange}
            testId="canvas-device-toggle"
            value={device}
          />
        </div>
      </div>
    </section>
  );
}
