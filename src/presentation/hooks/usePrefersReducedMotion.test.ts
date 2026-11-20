import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type MediaListener = (event: MediaQueryListEvent) => void;

function installMediaQuery(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mediaQuery = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
  return {
    emit(matches: boolean) {
      mediaQuery.matches = matches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePrefersReducedMotion', () => {
  it('returns false when the OS does not request reduced motion', () => {
    installMediaQuery(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when reduced motion is already enabled', () => {
    installMediaQuery(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('reacts to runtime changes and unsubscribes on unmount', () => {
    const media = installMediaQuery(false);
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());

    act(() => media.emit(true));
    expect(result.current).toBe(true);

    act(() => media.emit(false));
    expect(result.current).toBe(false);

    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it('stays false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});
