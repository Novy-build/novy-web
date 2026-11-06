import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CanvasRulers } from './CanvasRulers';

function frameArea(): HTMLElement {
  const child = screen.getByText('Frame');
  const area = child.parentElement;
  if (!area) {
    throw new Error('Frame area missing');
  }
  return area;
}

function stubRect(element: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
  element.getBoundingClientRect = () => ({
    bottom: rect.top + rect.height,
    height: rect.height,
    left: rect.left,
    right: rect.left + rect.width,
    toJSON: () => ({}),
    top: rect.top,
    width: rect.width,
    x: rect.left,
    y: rect.top,
  });
}

describe('CanvasRulers', () => {
  it('wraps the frame with both rulers, a corner badge, and its children', () => {
    render(
      <CanvasRulers height={780} width={390} zoom={1}>
        <div>Frame</div>
      </CanvasRulers>,
    );

    expect(screen.getByTestId('ruler-corner')).toHaveTextContent('px');
    expect(screen.getByTestId('ruler-horizontal')).toBeInTheDocument();
    expect(screen.getByTestId('ruler-vertical')).toBeInTheDocument();
    expect(screen.getByText('Frame')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-with-rulers').style.width).toBe('414px'); // 390 + 24
  });

  it('can hide the strips without unmounting the frame', () => {
    render(
      <CanvasRulers height={780} visible={false} width={390} zoom={1}>
        <div>Frame</div>
      </CanvasRulers>,
    );

    expect(screen.queryByTestId('ruler-horizontal')).not.toBeInTheDocument();
    expect(screen.getByTestId('canvas-with-rulers')).toHaveAttribute('data-rulers-visible', 'false');
    expect(screen.getByTestId('canvas-with-rulers').style.width).toBe('390px');
    expect(screen.getByText('Frame')).toBeInTheDocument();
  });

  it('reports pointer positions in design units and clears on leave', () => {
    render(
      <CanvasRulers height={780} width={390} zoom={2}>
        <div>Frame</div>
      </CanvasRulers>,
    );
    const area = frameArea();
    stubRect(area, { height: 1560, left: 24, top: 24, width: 780 });

    fireEvent.pointerMove(area, { clientX: 124, clientY: 224 });

    // (124 - 24) / 2 = 50 design px -> marker at 50 * 2 = 100 screen px.
    expect(screen.getByTestId('ruler-pointer-horizontal').style.left).toBe('100px');
    expect(screen.getByTestId('ruler-pointer-vertical').style.top).toBe('200px');

    fireEvent.pointerLeave(area);
    expect(screen.queryByTestId('ruler-pointer-horizontal')).not.toBeInTheDocument();
  });

  it('ignores pointer movement when the frame has no layout box', () => {
    render(
      <CanvasRulers height={780} width={390} zoom={1}>
        <div>Frame</div>
      </CanvasRulers>,
    );

    fireEvent.pointerMove(frameArea(), { clientX: 50, clientY: 50 });

    expect(screen.queryByTestId('ruler-pointer-horizontal')).not.toBeInTheDocument();
  });
});
