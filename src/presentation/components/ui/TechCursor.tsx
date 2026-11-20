import { useEffect, useRef, useState } from 'react';

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [tabindex="0"]';
const RING_EASING = 0.18;

interface Point {
  x: number;
  y: number;
}

/** A precise pointer dot with a larger outlined ring that follows behind. */
export function TechCursor() {
  const [engaged, setEngaged] = useState(false);
  const engagedRef = useRef(false);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const target = useRef<Point>({ x: -100, y: -100 });
  const ring = useRef<Point>({ x: -100, y: -100 });

  useEffect(() => {
    let frame = 0;

    const setVisible = (visible: boolean) => {
      const opacity = visible ? '1' : '0';
      if (dotRef.current) dotRef.current.style.opacity = opacity;
      if (ringRef.current) ringRef.current.style.opacity = opacity;
    };

    const onMove = (event: PointerEvent) => {
      // A custom pointer is meaningless for direct touch interaction. Unlike a
      // CSS media query, the real event reliably distinguishes mouse/pen.
      if (event.pointerType === 'touch') {
        setVisible(false);
        return;
      }

      target.current = { x: event.clientX, y: event.clientY };
      if (!initialized.current) {
        initialized.current = true;
        ring.current = { x: event.clientX, y: event.clientY };
        if (ringRef.current) {
          ringRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
        }
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      }
      setVisible(true);

      const node = event.target as Element | null;
      const next = Boolean(node?.closest?.(INTERACTIVE));
      if (next !== engagedRef.current) {
        engagedRef.current = next;
        setEngaged(next);
      }
    };

    const onExit = (event: PointerEvent) => {
      if (event.relatedTarget === null) setVisible(false);
    };

    const tick = () => {
      ring.current.x += (target.current.x - ring.current.x) * RING_EASING;
      ring.current.y += (target.current.y - ring.current.y) * RING_EASING;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%)`;
      }
      frame = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerout', onExit);
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onExit);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 2_147_483_647 }}
    >
      <div
        className="absolute left-0 top-0 opacity-0 will-change-transform"
        data-testid="cursor-ring"
        ref={ringRef}
      >
        <div
          className={`h-10 w-10 rounded-full border border-brand-50/80 bg-brand-50/[0.03] shadow-[0_0_18px_rgba(194,200,255,0.16)] transition-transform duration-200 ${
            engaged ? 'scale-125' : 'scale-100'
          }`}
        />
      </div>
      <div
        className="absolute left-0 top-0 h-2 w-2 rounded-full bg-white opacity-0 shadow-[0_0_10px_rgba(238,240,255,0.9)] will-change-transform"
        data-testid="cursor-dot"
        ref={dotRef}
      />
    </div>
  );
}
