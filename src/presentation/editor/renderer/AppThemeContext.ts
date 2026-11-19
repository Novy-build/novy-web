import { createContext, useContext } from 'react';

export type AppTheme = 'light' | 'dark';
export type AppThemePreference = AppTheme | 'system';

export interface AppThemeController {
  theme: AppTheme;
  setTheme: (theme: AppThemePreference) => void;
}

export const AppThemeContext = createContext<AppThemeController | null>(null);

export function useAppTheme(): AppThemeController | null {
  return useContext(AppThemeContext);
}
