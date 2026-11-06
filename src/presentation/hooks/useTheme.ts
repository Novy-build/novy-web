import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'novy.theme.v1';

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch {
    // Ignore storage failures (private mode, quota).
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return systemPrefersDark();
}

/**
 * Theme controller: supports light/dark/system, persists the choice, applies a
 * `.dark` class on <html>, and follows OS changes while in "system" mode.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference());
  const [isDark, setIsDark] = useState<boolean>(() => resolveDark(readPreference()));

  const apply = useCallback((dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setIsDark(dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', dark ? '#0b0d11' : '#f5f6f8');
    }
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures.
      }
      apply(resolveDark(next));
    },
    [apply],
  );

  const toggle = useCallback(() => {
    setPreference(isDark ? 'light' : 'dark');
  }, [isDark, setPreference]);

  useEffect(() => {
    apply(resolveDark(preference));
    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    const handler = () => {
      if (preference === 'system') {
        apply(systemPrefersDark());
      }
    };
    if (mediaQuery) {
      mediaQuery.addEventListener('change', handler);
    }
    return () => {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handler);
      }
    };
  }, [preference, apply]);

  return { preference, isDark, setPreference, toggle };
}
