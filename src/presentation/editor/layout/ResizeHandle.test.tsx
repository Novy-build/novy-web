import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResizeHandle } from './ResizeHandle';

describe('ResizeHandle', () => {
  it('exposes separator semantics and keyboard support', () => {
    const onKeyDown = vi.fn();
    render(
      <ResizeHandle
        controls="panel"
        isDragging={false}
        label="Resize panel"
        max={300}
        min={100}
        onDoubleClick={vi.fn()}
        onKeyDown={onKeyDown}
        onPointerDown={vi.fn()}
        orientation="horizontal"
        value={150}
      />,
    );

    const handle = screen.getByRole('separator', { name: 'Resize panel' });
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-valuemin', '100');
    expect(handle).toHaveAttribute('aria-valuemax', '300');
    expect(handle).toHaveAttribute('aria-valuenow', '150');
    expect(handle).toHaveAttribute('aria-controls', 'panel');
    expect(handle).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onKeyDown).toHaveBeenCalled();
  });
});