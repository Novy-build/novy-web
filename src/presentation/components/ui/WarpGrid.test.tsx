import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WarpGrid } from './WarpGrid';

interface DrawContext {
  clearRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  strokeStyle: string;
  lineWidth: number;
}

const context: DrawContext = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setTransform: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
};

let callbacks: FrameRequestCallback[] = [];

beforeEach(() => {
  callbacks = [];
  Object.values(context).forEach((value) => {
    if (typeof value === 'function' && 'mockClear' in value) value.mockClear();
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 200,
    width: 200,
    height: 200,
    toJSON: () => ({}),
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function flushFrame(): void {
  act(() => {
    // Mount queues a resize pass that in turn queues the first draw.
    for (let pass = 0; pass < 4; pass += 1) {
      const pending = callbacks;
      callbacks = [];
      pending.forEach((callback) => callback(0));
    }
  });
}

describe('WarpGrid', () => {
  it('renders a decorative canvas for each panel tone', () => {
    render(
      <>
        <WarpGrid tone="brand" />
        <WarpGrid tone="canvas" />
      </>,
    );
    expect(screen.getByTestId('warp-grid-brand')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('warp-grid-canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the grid when mounted', () => {
    render(<WarpGrid tone="canvas" />);
    flushFrame();
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
  });

  it('bends the lines around the pointer', () => {
    render(<WarpGrid tone="canvas" />);
    flushFrame();
    context.lineTo.mockClear();
    context.stroke.mockClear();

    fireEvent.pointerMove(window, { clientX: 50, clientY: 50 });
    flushFrame();

    const displaced = context.lineTo.mock.calls.some(([x, y]) =>
      Math.abs(Number(x) % 12) > 0.01 || Math.abs(Number(y) % 12) > 0.01,
    );
    expect(displaced).toBe(true);
    expect(context.stroke.mock.calls.length).toBeGreaterThan(1);
  });

  it('removes the local warp when the pointer leaves the panel', () => {
    render(<WarpGrid tone="brand" />);
    flushFrame();
    fireEvent.pointerMove(window, { clientX: 50, clientY: 50 });
    flushFrame();
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 });
    context.stroke.mockClear();
    flushFrame();

    // One base-grid stroke; no segment-by-segment local overlay.
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });
});
