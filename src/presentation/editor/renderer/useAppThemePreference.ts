import { useEffect, useState } from 'react';
import type { AppTheme, AppThemePreference } from './AppThemeContext';

export function systemAppTheme(): AppTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveAppTheme(preference: AppThemePreference, systemTheme: AppTheme): AppTheme {
  return preference === 'system' ? systemTheme : preference;
}

export const EDITOR_APP_THEME_STORAGE_KEY = 'novy.editor-app-theme.v1';

export function readEditorAppThemePreference(
  defaultTheme: AppThemePreference,
): AppThemePreference {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const stored = window.localStorage.getItem(EDITOR_APP_THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function useEditorAppThemePreference(
  defaultTheme: AppThemePreference,
): [
  AppThemePreference,
  (next: AppThemePreference | ((previous: AppThemePreference) => AppThemePreference)) => void,
] {
  const [preference, setPreference] = useState<AppThemePreference>(
    () => readEditorAppThemePreference(defaultTheme),
  );
  const set = (
    next: AppThemePreference | ((previous: AppThemePreference) => AppThemePreference),
  ): void => {
    setPreference((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      try {
        window.localStorage.setItem(EDITOR_APP_THEME_STORAGE_KEY, resolved);
      } catch {
        // Storage can be blocked; the in-memory preference still works.
      }
      return resolved;
    });
  };
  return [preference, set];
}

export function useSystemAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>(systemAppTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = (): void => setTheme(query.matches ? 'dark' : 'light');
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  return theme;
}
