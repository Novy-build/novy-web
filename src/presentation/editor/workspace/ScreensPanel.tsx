import { useState, type FocusEvent, type KeyboardEvent } from 'react';
import { EllipsisVertical, Plus, Search } from 'lucide-react';
import type { Screen } from '@domain/entities/screen';

interface ScreensPanelProps {
  screens: readonly Screen[];
  activeScreenId: string;
  onSelectScreen: (screenId: string) => void;
  onAddScreen: () => void;
  onRenameScreen: (screenId: string, name: string) => void;
  onDeleteScreen: (screenId: string) => void;
}

/**
 * Left-sidebar screen list with a management menu for rename and delete.
 * Selecting a screen also opens its editor tab when that tab was closed.
 */
export function ScreensPanel({
  screens,
  activeScreenId,
  onSelectScreen,
  onAddScreen,
  onRenameScreen,
  onDeleteScreen,
}: ScreensPanelProps) {
  const [query, setQuery] = useState('');
  const [menuScreenId, setMenuScreenId] = useState<string | null>(null);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleScreens = normalizedQuery.length === 0
    ? screens
    : screens.filter((screen) => screen.name.toLocaleLowerCase().includes(normalizedQuery));

  function startRename(screen: Screen): void {
    setMenuScreenId(null);
    setEditingScreenId(screen.id);
    setDraftName(screen.name);
  }

  function commitRename(): void {
    if (editingScreenId) {
      const trimmed = draftName.trim();
      if (trimmed.length > 0) onRenameScreen(editingScreenId, trimmed);
    }
    setEditingScreenId(null);
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') commitRename();
    if (event.key === 'Escape') setEditingScreenId(null);
  }

  function handleRenameBlur(event: FocusEvent<HTMLInputElement>): void {
    void event;
    commitRename();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            aria-label="Search screens"
            className="h-8 w-full rounded-tile border border-hairline bg-surface pl-7 pr-2 text-xs text-ink outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search screens"
            type="search"
            value={query}
          />
        </div>
        <button
          aria-label="Add screen in sidebar"
          className="flex min-h-8 min-w-8 items-center justify-center rounded-tile text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          onClick={onAddScreen}
          title="Add screen"
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <ul aria-label="Project screens" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {visibleScreens.map((screen) => {
          const isActive = screen.id === activeScreenId;
          const isEditing = screen.id === editingScreenId;
          return (
            <li className="relative mb-1" key={screen.id}>
              {isEditing ? (
                <input
                  aria-label="Screen name in sidebar"
                  autoFocus
                  className="h-8 w-full rounded-tile border border-brand-600 bg-surface px-2 text-xs font-medium text-ink outline-none"
                  onBlur={handleRenameBlur}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  value={draftName}
                />
              ) : (
                <div
                  className={`flex h-8 items-center gap-1.5 rounded-tile border px-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-hairline bg-canvas text-ink'
                      : 'border-transparent text-ink-muted hover:bg-surface hover:text-ink'
                  }`}
                >
                  <button
                    aria-current={isActive ? 'true' : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => onSelectScreen(screen.id)}
                    onDoubleClick={() => startRename(screen)}
                    title="Double-click to rename"
                    type="button"
                  >
                    <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-hairline bg-surface" />
                    <span className="truncate">{screen.name}</span>
                  </button>
                  <button
                    aria-expanded={menuScreenId === screen.id}
                    aria-haspopup="menu"
                    aria-label={`Screen options for ${screen.name}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                    onClick={() => setMenuScreenId((current) => current === screen.id ? null : screen.id)}
                    type="button"
                  >
                    <EllipsisVertical aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {menuScreenId === screen.id ? (
                <div
                  aria-label={`Menu for ${screen.name}`}
                  className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-tile border border-hairline bg-surface shadow-md"
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
                    title={screens.length <= 1 ? 'A project needs at least one screen' : undefined}
                    type="button"
                  >
                    Delete screen
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
        {visibleScreens.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-ink-muted">
            No screens match “{query.trim()}”.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
