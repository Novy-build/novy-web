import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { RULER_THICKNESS } from '../state/ruler';
import { Ruler } from './Ruler';

export interface CanvasRulersProps {
  /** Frame width in design-space units. */
  width: number;
  /** Frame height in design-space units. */
  height: number;
  zoom: number;
  /** Hides the strips while keeping the same wrapper/centring behaviour. */
  visible?: boolean;
  children: ReactNode;
}

interface PointerPoint {
  x: number;
  y: number;
}

/**
 * Wraps the device frame with horizontal/vertical rulers and a corner unit
 * badge. Pointer state lives here so moving the mouse only re-renders the
 * rulers, not the design canvas or its selection overlay.
 */
export function CanvasRulers({
  width,
  height,
  zoom,
  visible = true,
  children,
}: CanvasRulersProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<PointerPoint | null>(null);

  const screenWidth = Math.max(0, width * zoom);
  const screenHeight = Math.max(0, height * zoom);
  const offset = visible ? RULER_THICKNESS : 0;

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return;
    }
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    if (x < 0 || y < 0 || x > width || y > height) {
      setPointer(null);
      return;
    }
    const next = { x: Math.round(x), y: Math.round(y) };
    setPointer((previous) =>
      previous && previous.x === next.x && previous.y === next.y ? previous : next,
    );
  }

  return (
    <div
      className="relative mx-auto shrink-0"
      data-rulers-visible={visible}
      data-testid="canvas-with-rulers"
      style={{ height: screenHeight + offset, width: screenWidth + offset }}
    >
      {visible ? (
        <>
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 z-10 flex items-center justify-center border-b border-r border-hairline bg-surface-subtle font-mono text-[9px] uppercase text-ink-muted"
            data-testid="ruler-corner"
            style={{ height: RULER_THICKNESS, width: RULER_THICKNESS }}
          >
            px
          </div>

          <div className="absolute z-10" style={{ left: RULER_THICKNESS, top: 0 }}>
            <Ruler
              length={width}
              orientation="horizontal"
              pointer={pointer?.x ?? null}
              zoom={zoom}
            />
          </div>

          <div className="absolute z-10" style={{ left: 0, top: RULER_THICKNESS }}>
            <Ruler
              length={height}
              orientation="vertical"
              pointer={pointer?.y ?? null}
              zoom={zoom}
            />
          </div>
        </>
      ) : null}

      <div
        className="absolute"
        onPointerLeave={visible ? () => setPointer(null) : undefined}
        onPointerMove={visible ? handlePointerMove : undefined}
        ref={frameRef}
        style={{
          height: screenHeight,
          left: offset,
          top: offset,
          width: screenWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}
