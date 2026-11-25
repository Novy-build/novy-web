import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EDITOR_APP_THEME_STORAGE_KEY,
  readEditorAppThemePreference,
  resolveAppTheme,
  useEditorAppThemePreference,
  useSystemAppTheme,
} from './useAppThemePreference';

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

  it('starts from the project default and keeps an explicit stored choice', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
      },
    });
    expect(readEditorAppThemePreference('dark')).toBe('dark');
    values.set(EDITOR_APP_THEME_STORAGE_KEY, 'light');
    expect(readEditorAppThemePreference('dark')).toBe('light');

    const { result } = renderHook(() => useEditorAppThemePreference('dark'));
    expect(result.current[0]).toBe('light');
    act(() => result.current[1]('system'));
    expect(result.current[0]).toBe('system');
    expect(values.get(EDITOR_APP_THEME_STORAGE_KEY)).toBe('system');
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
