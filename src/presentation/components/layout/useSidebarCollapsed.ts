import { useCallback, useState } from 'react';

const STORAGE_KEY = 'novy.sidebar.collapsed.v1';

/**
 * Persists the sidebar's collapsed state across reloads. Defaults to expanded
 * so the first-run experience shows the full n8n-style sidebar.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage failures (private mode, quota).
      }
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'false');
    } catch {
      // Ignore.
    }
  }, []);

  return { collapsed, toggle, expand };
}
