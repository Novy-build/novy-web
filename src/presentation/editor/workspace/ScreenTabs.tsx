import { X } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Screen } from '@domain/entities/screen';

interface ScreenTabsProps {
  screens: readonly Screen[];
  activeScreenId: string;
  onSelectScreen: (screenId: string) => void;
  onAddScreen: () => void;
  /** Closes only the editor tab; it never deletes the persisted screen. */
  onCloseScreen: (screenId: string) => void;
}

/** VS Code-style open-screen tabs. Screen management stays in the sidebar. */
export function ScreenTabs({
  screens,
  activeScreenId,
  onSelectScreen,
  onAddScreen,
  onCloseScreen,
}: ScreenTabsProps) {
  function closeTab(event: MouseEvent<HTMLButtonElement>, screenId: string): void {
    event.stopPropagation();
    onCloseScreen(screenId);
  }

  return (
    <div className="flex items-end gap-1 border-b border-hairline bg-canvas px-3">
      {screens.map((screen) => {
        const isActive = screen.id === activeScreenId;
        return (
          <div className="relative flex items-stretch" key={screen.id}>
            <button
              aria-current={isActive ? 'true' : undefined}
              className={`h-9 rounded-t-tile border border-b-0 pl-3 pr-10 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-hairline bg-surface text-ink'
                  : 'border-transparent text-ink-muted hover:bg-surface hover:text-ink'
              }`}
              onClick={() => onSelectScreen(screen.id)}
              type="button"
            >
              {screen.name}
            </button>
            <button
              aria-label={`Close tab ${screen.name}`}
              className="absolute right-1 top-0 flex h-9 w-7 items-center justify-center rounded-t-tile text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
              onClick={(event) => closeTab(event, screen.id)}
              title={`Close ${screen.name} tab`}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <button
        aria-label="Add screen"
        className="mb-1 rounded-tile px-2 py-1 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        onClick={onAddScreen}
        type="button"
      >
        +
      </button>
    </div>
  );
}
