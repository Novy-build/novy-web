import { useEffect, useState } from 'react';
import type { AppTheme, AppThemePreference } from './AppThemeContext';

export function systemAppTheme(): AppTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveAppTheme(preference: AppThemePreference, systemTheme: AppTheme): AppTheme {
  return preference === 'system' ? systemTheme : preference;
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
