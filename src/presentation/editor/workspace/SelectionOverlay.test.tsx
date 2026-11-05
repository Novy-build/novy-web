import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionOverlay } from './SelectionOverlay';

function renderOverlay(overrides: Record<string, unknown> = {}) {
  const props = {
    geometry: { x: 100, y: 100, w: 80, h: 60 },
    zoom: 2,
    device: 'mobile' as const,
    isSnapEnabled: true,
    onResize: vi.fn(),
    onResizeStart: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onAddBehavior: vi.fn(),
    ...overrides,
  };
  render(<SelectionOverlay {...props} />);
  return props;
}

describe('SelectionOverlay', () => {
  it('renders eight resize handles scaled to the zoom level', () => {
    renderOverlay();

    for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      expect(screen.getByTestId(`resize-handle-${handle}`)).toBeInTheDocument();
    }
    const outline = screen.getByTestId('selection-outline');
    expect(outline.style.width).toBe('160px'); // 80 * zoom 2
    expect(outline.style.left).toBe('200px');
  });

  it('resizes through zoom-scaled pointer deltas, snapping to the grid', () => {
    const props = renderOverlay();
    const handle = screen.getByTestId('resize-handle-se');

    fireEvent.pointerDown(handle, { clientX: 200, clientY: 200 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 212, clientY: 220 }));
    });

    // dx = 12 / zoom 2 = 6 -> snaps to 8; dy = 20 / 2 = 10 -> snaps to 8
    expect(props.onResize).toHaveBeenCalledWith({ x: 100, y: 100, w: 88, h: 68 });
    expect(props.onResizeStart).toHaveBeenCalledTimes(1);
  });

  it('stops resizing after pointerup', () => {
    const props = renderOverlay();
    const handle = screen.getByTestId('resize-handle-se');

    fireEvent.pointerDown(handle, { clientX: 200, clientY: 200 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 300 }));
    });

    expect(props.onResize).not.toHaveBeenCalled();
  });

  it('exposes toolbar actions for the selected node', () => {
    const props = renderOverlay();

    expect(screen.getByRole('group', { name: 'Selection actions' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Duplicate selected component'));
    fireEvent.click(screen.getByLabelText('Delete selected component'));
    fireEvent.click(screen.getByLabelText('Add behavior to selected component'));

    expect(props.onDuplicate).toHaveBeenCalledTimes(1);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
    expect(props.onAddBehavior).toHaveBeenCalledTimes(1);
  });
});
