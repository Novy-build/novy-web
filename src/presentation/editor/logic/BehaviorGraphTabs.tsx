interface BehaviorGraphTabsProps {
  tabs: readonly { id: string; label: string }[];
  /** Resolved active id (falls back to the first behavior when the state id is stale). */
  activeBehaviorId: string | null;
  onSelect: (behaviorId: string) => void;
}

/**
 * Workflow tabs. Behavior remains an internal persistence concept.
 */
export function BehaviorGraphTabs({ tabs, activeBehaviorId, onSelect }: BehaviorGraphTabsProps) {
  if (tabs.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 border-b border-hairline bg-surface px-4 py-2">
        <div aria-label="Workflows" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="tablist">
          {tabs.map((tab) => (
            <button
              aria-selected={tab.id === activeBehaviorId}
              className={`shrink-0 rounded-tile px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                tab.id === activeBehaviorId ? 'bg-canvas text-ink' : 'text-ink-muted hover:text-ink'
              }`}
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
    </div>
  );
}
