import { useEffect, useState } from 'react';
import type { AppTheme } from './AppThemeContext';

export function readDocumentAppTheme(): AppTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Design canvases and thumbnails follow Novy's shell theme unless the caller
 * provides an explicit app theme (Preview does). The shell applies `.dark` on
 * <html>, so observe that class instead of duplicating theme state.
 */
export function useDocumentAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>(readDocumentAppTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const sync = (): void => {
      setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    };
    sync();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
