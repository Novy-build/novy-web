import { useEffect, useRef } from 'react';

const SPACING = 64;
const RADIUS = 180;
const STRENGTH = 34;
const STEP = 12;
const BASE_ALPHA = 0.055;
const LOCAL_ALPHA = 0.24;

interface Point {
  x: number;
  y: number;
}

interface WarpGridProps {
  tone: 'brand' | 'canvas';
}

function readToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb.trim().split(/\s+/).join(', ')}, ${alpha})`;
}

/**
 * A quiet baseline grid with a brighter, smoothly displaced area immediately
 * around the pointer. The local emphasis makes the interaction readable while
 * keeping the rest of the page calm.
 */
export function WarpGrid({ tone }: WarpGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let scheduled = false;
    let observer: ResizeObserver | null = null;

    const rgbToken = tone === 'brand' ? '--novy-warp-brand-rgb' : '--novy-warp-canvas-rgb';

    const displaced = (x: number, y: number): Point => {
      const cursor = pointer.current;
      if (!cursor) return { x, y };
      const dx = x - cursor.x;
      const dy = y - cursor.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance >= RADIUS) return { x, y };
      const push = (1 - distance / RADIUS) ** 2 * STRENGTH;
      return { x: x + (dx / distance) * push, y: y + (dy / distance) * push };
    };

    const drawBaseGrid = (rgb: string) => {
      ctx.strokeStyle = rgba(rgb, BASE_ALPHA);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += SPACING) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += SPACING) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };

    const drawLocalWarp = (rgb: string) => {
      const cursor = pointer.current;
      if (!cursor) return;

      const drawLine = (fixed: number, horizontal: boolean) => {
        const length = horizontal ? width : height;
        for (let along = 0; along < length; along += STEP) {
          const next = Math.min(length, along + STEP);
          const midX = horizontal ? (along + next) / 2 : fixed;
          const midY = horizontal ? fixed : (along + next) / 2;
          const distance = Math.hypot(midX - cursor.x, midY - cursor.y);
          if (distance >= RADIUS) continue;

          const falloff = (1 - distance / RADIUS) ** 1.5;
          const from = displaced(horizontal ? along : fixed, horizontal ? fixed : along);
          const to = displaced(horizontal ? next : fixed, horizontal ? fixed : next);
          ctx.strokeStyle = rgba(rgb, LOCAL_ALPHA * falloff);
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      };

      const startX = Math.floor((cursor.x - RADIUS) / SPACING) * SPACING;
      const endX = cursor.x + RADIUS;
      const startY = Math.floor((cursor.y - RADIUS) / SPACING) * SPACING;
      const endY = cursor.y + RADIUS;
      for (let x = startX; x <= endX; x += SPACING) drawLine(x, false);
      for (let y = startY; y <= endY; y += SPACING) drawLine(y, true);
    };

    const draw = () => {
      const rgb = readToken(rgbToken, '238 240 255');
      ctx.clearRect(0, 0, width, height);
      drawBaseGrid(rgb);
      drawLocalWarp(rgb);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      frame = window.requestAnimationFrame(() => {
        scheduled = false;
        draw();
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || canvas.clientWidth;
      height = rect.height || canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.current = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height ? { x, y } : null;
      schedule();
    };
    const onExit = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      pointer.current = null;
      schedule();
    };

    resize();
    frame = window.requestAnimationFrame(resize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerout', onExit);
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onExit);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [tone]);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-testid={`warp-grid-${tone}`}
      ref={canvasRef}
    />
  );
}
