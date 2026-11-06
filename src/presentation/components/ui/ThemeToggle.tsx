import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@presentation/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Compact light/dark toggle. Defaults to neutral surface styling so it works on
 * both light pages and dark surfaces (e.g. the sidebar) via the className prop.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-8 w-8 items-center justify-center rounded-tile border transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${
        className ?? 'border-hairline bg-surface text-ink-muted hover:bg-canvas hover:text-ink'
      }`}
      onClick={toggle}
      title={isDark ? 'Light mode' : 'Dark mode'}
      type="button"
    >
      {isDark ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
    </button>
  );
}
