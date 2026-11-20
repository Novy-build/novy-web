import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TechCursor } from './TechCursor';

let frame: FrameRequestCallback | null = null;

beforeEach(() => {
  frame = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function flushFrame(): void {
  act(() => frame?.(0));
}

describe('TechCursor', () => {
  it('renders a decorative dot and following ring above the page', () => {
    const { container } = render(<TechCursor />);
    expect(screen.getByTestId('cursor-dot')).toBeInTheDocument();
    expect(screen.getByTestId('cursor-ring')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('ignores direct touch movement', () => {
    render(<TechCursor />);
    fireEvent.pointerMove(window, { clientX: 40, clientY: 30, pointerType: 'touch' });
    expect(screen.getByTestId('cursor-dot').style.opacity).toBe('0');
    expect(screen.getByTestId('cursor-ring').style.opacity).toBe('0');
  });

  it('places the dot immediately and eases the ring behind it', () => {
    render(<TechCursor />);
    const dot = screen.getByTestId('cursor-dot');
    const ring = screen.getByTestId('cursor-ring');

    fireEvent.pointerMove(window, { clientX: 240, clientY: 180 });
    expect(dot.style.transform).toContain('240px');
    expect(dot.style.transform).toContain('180px');
    expect(ring.style.opacity).toBe('1');
    expect(ring.style.transform).toContain('240px');

    fireEvent.pointerMove(window, { clientX: 340, clientY: 220 });
    flushFrame();
    const first = ring.style.transform;
    expect(first).toContain('translate3d');
    expect(first).not.toContain('340px');
    flushFrame();
    expect(ring.style.transform).not.toBe(first);
  });

  it('enlarges the ring over interactive controls and hides on leave', () => {
    render(
      <>
        <button type="button">Continue</button>
        <TechCursor />
      </>,
    );
    const ring = screen.getByTestId('cursor-ring');

    fireEvent.pointerMove(screen.getByRole('button'), { clientX: 60, clientY: 40 });
    expect(ring.firstElementChild).toHaveClass('scale-125');

    fireEvent.pointerOut(document, { relatedTarget: null });
    expect(ring.style.opacity).toBe('0');
    expect(screen.getByTestId('cursor-dot').style.opacity).toBe('0');
  });
});
