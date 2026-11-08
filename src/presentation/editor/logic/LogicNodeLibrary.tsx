import { useMemo, useState, type DragEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  LOGIC_NODE_DEFINITIONS,
  LOGIC_NODE_MIME,
  type LogicLibraryNode,
  type LogicNodeCategory,
} from './logicNodeRegistry';
import { PanelCollapseButton } from '../PanelCollapseControl';

const CATEGORY_ORDER: readonly LogicNodeCategory[] = [
  'Triggers',
  'Flow',
  'UI',
  'Database',
  'Actions',
  'RAG Nodes',
  'Computer Vision',
];

export function LogicNodeLibrary({
  onAdd,
  onCollapse,
}: {
  onAdd: (node: LogicLibraryNode) => void;
  onCollapse?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<LogicNodeCategory>>(
    () => new Set(),
  );
  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () => LOGIC_NODE_DEFINITIONS.filter((definition) => {
      const haystack = [definition.label, definition.description, ...definition.keywords]
        .join(' ')
        .toLowerCase();
      return query.length === 0 || haystack.includes(query);
    }),
    [query],
  );

  function beginDrag(event: DragEvent<HTMLButtonElement>, definitionId: string): void {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(LOGIC_NODE_MIME, definitionId);
  }

  function toggleCategory(category: LogicNodeCategory): void {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface" aria-label="Logic nodes">
      <div className="border-b border-hairline p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Nodes</h2>
          {onCollapse ? (
            <PanelCollapseButton
              controls="logic-nodes-panel"
              isCollapsed={false}
              label="nodes panel"
              onToggle={onCollapse}
              side="left"
            />
          ) : null}
        </div>
        <label className="sr-only" htmlFor="logic-node-search">Search nodes</label>
        <input
          className="mt-2 h-9 w-full rounded-md border border-hairline bg-canvas px-3 text-sm text-ink outline-none focus:border-brand-500"
          id="logic-node-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search nodes…"
          type="search"
          value={search}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2" data-testid="logic-node-list">
        {CATEGORY_ORDER.map((category) => {
          const definitions = visible.filter((definition) => definition.category === category);
          if (definitions.length === 0) return null;
          const isCollapsed = collapsedCategories.has(category);
          const categoryPanelId = `logic-node-category-${category.toLowerCase().replaceAll(' ', '-')}`;
          const CategoryIcon = isCollapsed ? ChevronRight : ChevronDown;
          return (
            <section className="mb-2" key={category}>
              <h3>
                <button
                  aria-controls={categoryPanelId}
                  aria-expanded={!isCollapsed}
                  aria-label={`${category} group`}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                  onClick={() => toggleCategory(category)}
                  type="button"
                >
                  <CategoryIcon aria-hidden="true" size={14} strokeWidth={1.75} />
                  <span>{category}</span>
                  <span aria-hidden="true" className="ml-auto rounded-full bg-canvas px-1.5 py-0.5 text-[9px] tabular-nums">
                    {definitions.length}
                  </span>
                </button>
              </h3>
              <ul className="grid gap-1" hidden={isCollapsed} id={categoryPanelId}>
                {definitions.map((definition) => (
                  <li key={definition.id}>
                    <button
                      aria-label={definition.label}
                      className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-canvas"
                      draggable
                      onClick={() => onAdd(definition.create())}
                      onDragStart={(event) => beginDrag(event, definition.id)}
                      type="button"
                    >
                      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">{definition.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-ink">{definition.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">{definition.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {visible.length === 0 ? (
          <p className="p-3 text-sm text-ink-muted" role="status">No nodes match “{search}”.</p>
        ) : null}
      </div>
    </aside>
  );
}
