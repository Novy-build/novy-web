import { useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { Screen } from '@domain/entities/screen';

interface ScreenTabsProps {
  screens: readonly Screen[];
  activeScreenId: string;
  onSelectScreen: (screenId: string) => void;
  onAddScreen: () => void;
  onRenameScreen: (screenId: string, name: string) => void;
  onDeleteScreen: (screenId: string) => void;
}

/**
 * Strip above the canvas: one tab per screen with an add button and a per-tab
 * menu (rename inline, delete — disabled while a single screen remains).
 */
export function ScreenTabs({
  screens,
  activeScreenId,
  onSelectScreen,
  onAddScreen,
  onRenameScreen,
  onDeleteScreen,
}: ScreenTabsProps) {
  const [menuScreenId, setMenuScreenId] = useState<string | null>(null);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function startRename(screen: Screen) {
    setMenuScreenId(null);
    setEditingScreenId(screen.id);
    setDraftName(screen.name);
  }

  function commitRename() {
    if (editingScreenId) {
      const trimmed = draftName.trim();
      if (trimmed.length > 0) {
        onRenameScreen(editingScreenId, trimmed);
      }
    }
    setEditingScreenId(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      commitRename();
    }
    if (event.key === 'Escape') {
      setEditingScreenId(null);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    void event;
    commitRename();
  }

  return (
    <div className="flex items-end gap-1 border-b border-hairline bg-canvas px-3">
      {screens.map((screen) => {
        const isActive = screen.id === activeScreenId;
        const isEditing = screen.id === editingScreenId;
        return (
          <div
            className="relative flex items-stretch"
            key={screen.id}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setMenuScreenId(null);
              }
            }}
          >
            {isEditing ? (
              <input
                aria-label="Screen name"
                autoFocus
                className="h-9 w-36 rounded-t-tile border border-b-0 border-hairline bg-surface px-3 text-sm font-medium text-ink outline-none"
                onBlur={handleBlur}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={handleKeyDown}
                value={draftName}
              />
            ) : (
              <button
                aria-current={isActive ? 'true' : undefined}
                className={`h-9 rounded-t-tile border border-b-0 pl-3 pr-12 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-hairline bg-surface text-ink'
                    : 'border-transparent text-ink-muted hover:bg-surface hover:text-ink'
                }`}
                onClick={() => {
                  setMenuScreenId(null);
                  onSelectScreen(screen.id);
                }}
                type="button"
              >
                {screen.name}
              </button>
            )}

            {!isEditing ? (
              <button
                aria-expanded={menuScreenId === screen.id}
                aria-haspopup="menu"
                aria-label={`Screen options for ${screen.name}`}
                className="absolute right-1 top-0 h-9 w-8 rounded-t-tile text-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                onClick={() => setMenuScreenId((current) => (current === screen.id ? null : screen.id))}
                type="button"
              >
                ⋮
              </button>
            ) : null}

            {menuScreenId === screen.id ? (
              <div
                aria-label={`Menu for ${screen.name}`}
                className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-tile border border-hairline bg-surface shadow-md"
                role="menu"
              >
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
                  onClick={() => startRename(screen)}
                  role="menuitem"
                  type="button"
                >
                  Rename
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={screens.length <= 1}
                  onClick={() => {
                    setMenuScreenId(null);
                    onDeleteScreen(screen.id);
                  }}
                  role="menuitem"
                  type="button"
                  title={screens.length <= 1 ? 'A project needs at least one screen' : undefined}
                >
                  Delete screen
                </button>
              </div>
            ) : null}
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
