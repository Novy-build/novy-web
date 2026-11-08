import { createContext, useContext } from 'react';

export type AppTheme = 'light' | 'dark';

export interface AppThemeController {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const AppThemeContext = createContext<AppThemeController | null>(null);

export function useAppTheme(): AppThemeController | null {
  return useContext(AppThemeContext);
}
