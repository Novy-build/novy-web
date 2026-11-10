import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResizablePane } from './useResizablePane';

describe('useResizablePane', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('drags horizontally and clamps to the configured maximum', () => {
    const { result } = renderHook(() =>
      useResizablePane({
        defaultSize: 256,
        minSize: 200,
        maxSize: 300,
        orientation: 'horizontal',
        storageKey: 'test.horizontal',
        grow: 1,
      }),
    );

    const event = {
      button: 0,
      clientX: 100,
      preventDefault: vi.fn(),
    } as unknown as any;

    act(() => {
      result.current.startResize(event);
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400 }));
    });

    expect(result.current.size).toBe(300);

    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'));
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('requests collapse when the handle is dragged past the minimum', () => {
    const onCollapse = vi.fn();
    const { result } = renderHook(() =>
      useResizablePane({
        defaultSize: 220,
        minSize: 120,
        maxSize: 360,
        orientation: 'vertical',
        storageKey: 'test.collapse',
        grow: -1,
        onCollapse,
      }),
    );

    act(() => {
      result.current.startResize({
        button: 0,
        clientY: 300,
        preventDefault: vi.fn(),
      } as unknown as any);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 360 }));
    });
    expect(result.current.size).toBe(160);
    expect(onCollapse).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 500 }));
    });
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.size).toBe(220);

    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 600 }));
    });
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard resizing and reset defaults', () => {
    const { result } = renderHook(() =>
      useResizablePane({
        defaultSize: 256,
        minSize: 200,
        maxSize: 300,
        orientation: 'horizontal',
        storageKey: 'test.keyboard',
        grow: 1,
      }),
    );

    act(() => {
      result.current.onKeyDown({ key: 'ArrowRight', shiftKey: false, preventDefault: vi.fn() } as unknown as any);
    });
    expect(result.current.size).toBe(272);

    act(() => {
      result.current.onKeyDown({ key: 'Home', preventDefault: vi.fn() } as unknown as any);
    });
    expect(result.current.size).toBe(200);

    act(() => {
      result.current.reset();
    });
    expect(result.current.size).toBe(256);
  });

  it('persists the resized size', () => {
    const { result } = renderHook(() =>
      useResizablePane({
        defaultSize: 256,
        minSize: 200,
        maxSize: 300,
        orientation: 'horizontal',
        storageKey: 'test.persist',
        grow: 1,
      }),
    );

    act(() => {
      result.current.onKeyDown({ key: 'ArrowRight', shiftKey: false, preventDefault: vi.fn() } as unknown as any);
    });

    expect(window.localStorage.getItem('test.persist')).toBe(String(result.current.size));
  });
});