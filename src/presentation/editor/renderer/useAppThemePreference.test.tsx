import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAppTheme, useSystemAppTheme } from './useAppThemePreference';

describe('app theme preference', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('resolves explicit and system preferences', () => {
    expect(resolveAppTheme('light', 'dark')).toBe('light');
    expect(resolveAppTheme('dark', 'light')).toBe('dark');
    expect(resolveAppTheme('system', 'dark')).toBe('dark');
  });

  it('reacts to operating-system color-scheme changes', () => {
    let listener: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: vi.fn((_event: string, next: () => void) => { listener = next; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => media));

    const { result, unmount } = renderHook(() => useSystemAppTheme());
    expect(result.current).toBe('light');
    act(() => {
      media.matches = true;
      listener?.();
    });
    expect(result.current).toBe('dark');
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
