import { useCallback, useEffect, useRef, useState } from 'react';

export type ResizablePaneOrientation = 'horizontal' | 'vertical';

export interface UseResizablePaneOptions {
  defaultSize: number;
  minSize: number;
  maxSize: number;
  orientation: ResizablePaneOrientation;
  storageKey: string;
  /** Positive means the dragged handle moves in the same direction as size growth. */
  grow?: 1 | -1;
}

export interface UseResizablePaneResult {
  size: number;
  isDragging: boolean;
  startResize: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  reset: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function viewportCap(orientation: ResizablePaneOrientation): number {
  if (typeof window === 'undefined') {
    return Number.POSITIVE_INFINITY;
  }
  return orientation === 'horizontal'
    ? window.innerWidth * 0.4
    : window.innerHeight * 0.4;
}

function readStoredSize(storageKey: string, fallback: number, min: number, max: number, orientation: ResizablePaneOrientation): number {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) {
      return clamp(fallback, min, Math.min(max, viewportCap(orientation)));
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return clamp(fallback, min, Math.min(max, viewportCap(orientation)));
    }
    return clamp(parsed, min, Math.min(max, viewportCap(orientation)));
  } catch {
    return clamp(fallback, min, Math.min(max, viewportCap(orientation)));
  }
}

export function useResizablePane(options: UseResizablePaneOptions): UseResizablePaneResult {
  const { defaultSize, minSize, maxSize, orientation, storageKey, grow = 1 } = options;
  const [size, setSize] = useState<number>(() => readStoredSize(storageKey, defaultSize, minSize, maxSize, orientation));
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ pointer: number; size: number } | null>(null);

  const effectiveMax = Math.min(maxSize, viewportCap(orientation));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(size));
    } catch {
      // Ignore storage failures; resizing still works for the session.
    }
  }, [size, storageKey]);

  const reset = useCallback(() => {
    setSize(clamp(defaultSize, minSize, effectiveMax));
  }, [defaultSize, minSize, effectiveMax]);

  const startResize = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragStartRef.current = {
      pointer: orientation === 'horizontal' ? event.clientX : event.clientY,
      size,
    };
    setIsDragging(true);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    function handleMove(moveEvent: PointerEvent): void {
      const start = dragStartRef.current;
      if (!start) {
        return;
      }
      const current = orientation === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = (current - start.pointer) * grow;
      setSize(clamp(start.size + delta, minSize, effectiveMax));
    }

    function finish(): void {
      dragStartRef.current = null;
      setIsDragging(false);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', finish);
  }, [effectiveMax, grow, minSize, orientation, size]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    const horizontal = orientation === 'horizontal';
    const increaseKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    const decreaseKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const step = event.shiftKey ? 64 : 16;

    if (event.key === increaseKey) {
      event.preventDefault();
      setSize((current) => clamp(current + step * grow, minSize, effectiveMax));
      return;
    }
    if (event.key === decreaseKey) {
      event.preventDefault();
      setSize((current) => clamp(current - step * grow, minSize, effectiveMax));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setSize(minSize);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setSize(effectiveMax);
      return;
    }
  }, [effectiveMax, grow, minSize, orientation]);

  return { size, isDragging, startResize, onKeyDown, reset };
}