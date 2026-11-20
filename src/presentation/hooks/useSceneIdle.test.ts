import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSceneIdle } from './useSceneIdle';

afterEach(() => {
  vi.useRealTimers();
});

describe('useSceneIdle', () => {
  it('starts idle so ambient animation can play immediately', () => {
    const { result } = renderHook(() => useSceneIdle());
    expect(result.current.isIdle).toBe(true);
  });

  it('becomes active on interaction and returns to idle after the delay', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSceneIdle(2000));

    act(() => result.current.markActive());
    expect(result.current.isIdle).toBe(false);

    act(() => vi.advanceTimersByTime(1999));
    expect(result.current.isIdle).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isIdle).toBe(true);
  });

  it('restarts the countdown when another interaction arrives', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSceneIdle(2000));

    act(() => result.current.markActive());
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.markActive());
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.isIdle).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isIdle).toBe(true);
  });
});
