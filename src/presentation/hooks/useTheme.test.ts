import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    // Default system preference: light.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('defaults to system (light) and does not add .dark', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads a persisted dark preference', () => {
    window.localStorage.setItem('novy.theme.v1', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('toggle switches light <-> dark and persists', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setPreference('light');
    });
    expect(result.current.isDark).toBe(false);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isDark).toBe(true);
    expect(result.current.preference).toBe('dark');
    expect(window.localStorage.getItem('novy.theme.v1')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('system mode follows OS dark preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.localStorage.setItem('novy.theme.v1', 'system');
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
