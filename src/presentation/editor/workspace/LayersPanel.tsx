import { useState, type DragEvent, type KeyboardEvent } from 'react';
import type { ComponentNode, ResponsiveBreakpoint } from '@domain/entities/componentNode';
import { isHiddenAtBreakpoint } from '@domain/entities/componentNode';
import type { LayerDropPosition } from '@domain/componentTree';
import { nodeDisplayLabel, nodeLayerName } from './nodeLabels';

interface LayersPanelProps {
  nodes: readonly ComponentNode[];
  device?: ResponsiveBreakpoint;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onOrder: (nodeId: string, direction: 'forward' | 'backward') => void;
  onRename: (nodeId: string, name: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onMove: (nodeId: string, targetId: string, position: LayerDropPosition) => void;
  isEmbedded?: boolean;
}

interface LayerRow {
  node: ComponentNode;
  depth: number;
  parentId: string | null;
}

const TYPE_ICONS: Readonly<Record<ComponentNode['type'], string>> = {
  button: '▭',
  text: 'T',
  input: '⌨',
  image: '◇',
  container: '#',
  list: '☷',
  repeater: '☰',
  form: '▤',
  checkbox: '☑',
  radio: '◉',
  switch: '⏻',
  dropdown: '▾',
  slider: '═',
  progress: ' ',
  divider: '—',
  camera: '◉',
};

/** Figma-inspired hierarchical layer tree with persisted layer controls. */
export function LayersPanel({
  nodes,
  device = 'mobile',
  selectedNodeId,
  onSelect,
  onOrder,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onMove,
  isEmbedded = false,
}: LayersPanelProps) {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: LayerDropPosition;
  } | null>(null);
  const rows = buildRows(nodes, collapsedIds);

  function toggleExpanded(nodeId: string): void {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function beginRename(node: ComponentNode): void {
    setRenamingId(node.id);
    setRenameDraft(node.name ?? nodeDisplayLabel(node));
  }

  function commitRename(node: ComponentNode): void {
    const next = renameDraft.trim();
    if (next.length > 0 && next !== (node.name ?? nodeDisplayLabel(node))) {
      onRename(node.id, next);
    }
    setRenamingId(null);
  }

  function handleLayerKeyDown(event: KeyboardEvent<HTMLButtonElement>, row: LayerRow, index: number): void {
    if (event.key === 'F2') {
      event.preventDefault();
      beginRename(row.node);
      return;
    }
    if (!event.altKey) {
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onOrder(row.node.id, 'forward');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onOrder(row.node.id, 'backward');
    } else if (event.key === 'ArrowRight') {
      const rowAbove = rows[index - 1];
      if (rowAbove?.node.type === 'container' && !rowAbove.node.isLocked) {
        event.preventDefault();
        onMove(row.node.id, rowAbove.node.id, 'inside');
      }
    } else if (event.key === 'ArrowLeft' && row.parentId) {
      event.preventDefault();
      onMove(row.node.id, row.parentId, 'before');
    }
  }

  function handleDragStart(event: DragEvent<HTMLLIElement>, node: ComponentNode): void {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-novy-layer', node.id);
    setDraggingId(node.id);
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, target: ComponentNode): void {
    event.preventDefault();
    const sourceId = draggingId ?? event.dataTransfer.getData('application/x-novy-layer');
    if (sourceId && sourceId !== target.id) {
      const position: LayerDropPosition =
        target.type === 'container' && !event.altKey ? 'inside' : 'before';
      onMove(sourceId, target.id, position);
    }
    setDraggingId(null);
    setDropTarget(null);
  }

  const panelClass = isEmbedded
    ? 'min-h-0 flex-1 overflow-y-auto bg-surface p-2'
    : 'max-h-60 shrink-0 overflow-y-auto border-t border-hairline bg-surface p-3';

  return (
    <section aria-label="Layers" className={panelClass}>
      {!isEmbedded ? (
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Layers</h2>
      ) : null}
      {rows.length === 0 ? (
        <p className="p-2 text-sm text-ink-muted" role="status">
          No components yet — add one from Assets.
        </p>
      ) : (
        <ul aria-label="Component layers" className="grid gap-0.5" role="tree">
          {rows.map((row, index) => {
            const { node, depth } = row;
            const isSelected = node.id === selectedNodeId;
            const isCollapsed = collapsedIds.has(node.id);
            return (
              <li
                aria-expanded={node.type === 'container' ? !isCollapsed : undefined}
                aria-level={depth + 1}
                className={`group flex min-h-8 items-center gap-0.5 rounded-md border border-transparent pr-1 transition-colors ${
                  isSelected ? 'border-brand-500/60 bg-brand-500/15' : 'hover:bg-canvas'
                } ${isHiddenAtBreakpoint(node, device) ? 'opacity-55' : ''} ${
                  dropTarget?.id === node.id && dropTarget.position === 'inside'
                    ? 'ring-2 ring-brand-500'
                    : dropTarget?.id === node.id
                      ? 'border-t-2 border-t-brand-500'
                      : ''
                }`}
                data-testid={`layer-row-${node.id}`}
                draggable={!node.isLocked}
                key={node.id}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTarget(null);
                }}
                onDragOver={(event) => {
                  if (draggingId && draggingId !== node.id) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTarget({
                      id: node.id,
                      position: node.type === 'container' && !event.altKey ? 'inside' : 'before',
                    });
                  }
                }}
                onDragStart={(event) => handleDragStart(event, node)}
                onDrop={(event) => handleDrop(event, node)}
                role="treeitem"
                style={{ paddingLeft: depth * 14 + 2 }}
              >
                {node.type === 'container' ? (
                  <button
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${nodeLayerName(node)}`}
                    className="flex h-6 w-5 shrink-0 items-center justify-center text-[10px] text-ink-muted"
                    onClick={() => toggleExpanded(node.id)}
                    type="button"
                  >
                    {isCollapsed ? '›' : '⌄'}
                  </button>
                ) : (
                  <span aria-hidden="true" className="w-5 shrink-0" />
                )}

                <span aria-hidden="true" className="w-4 shrink-0 text-center text-[11px] text-ink-muted">
                  {TYPE_ICONS[node.type]}
                </span>

                {renamingId === node.id ? (
                  <input
                    aria-label={`Rename ${nodeLayerName(node)}`}
                    autoFocus
                    className="h-6 min-w-0 flex-1 rounded border border-brand-500 bg-surface px-1 text-xs text-ink outline-none"
                    onBlur={() => commitRename(node)}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitRename(node);
                      } else if (event.key === 'Escape') {
                        setRenamingId(null);
                      }
                    }}
                    value={renameDraft}
                  />
                ) : (
                  <button
                    aria-label={nodeLayerName(node)}
                    aria-pressed={isSelected}
                    className="min-w-0 flex-1 truncate px-1 py-1 text-left text-xs font-medium text-ink"
                    onClick={() => onSelect(node.id)}
                    onDoubleClick={() => beginRename(node)}
                    onKeyDown={(event) => handleLayerKeyDown(event, row, index)}
                    title="F2 rename · Alt+↑/↓ reorder · Alt+→/← nest"
                    type="button"
                  >
                    {nodeDisplayLabel(node)}
                  </button>
                )}

                <div
                  aria-label={`Layer controls for ${nodeLayerName(node)}`}
                  className={`flex shrink-0 items-center ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
                  role="group"
                >
                  <LayerControl
                    label={`${isHiddenAtBreakpoint(node, device) ? 'Show' : 'Hide'} ${nodeLayerName(node)}`}
                    onClick={() => onToggleVisibility(node.id)}
                    tooltip={isHiddenAtBreakpoint(node, device) ? 'Show layer' : 'Hide layer'}
                  >
                    {isHiddenAtBreakpoint(node, device) ? '○' : '◉'}
                  </LayerControl>
                  <LayerControl
                    label={`${node.isLocked ? 'Unlock' : 'Lock'} ${nodeLayerName(node)}`}
                    onClick={() => onToggleLock(node.id)}
                    tooltip={node.isLocked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {node.isLocked ? '◆' : '◇'}
                  </LayerControl>
                  <LayerControl
                    label={`Bring ${nodeLayerName(node)} forward`}
                    onClick={() => onOrder(node.id, 'forward')}
                    tooltip="Bring forward"
                  >
                    ↑
                  </LayerControl>
                  <LayerControl
                    label={`Send ${nodeLayerName(node)} backward`}
                    onClick={() => onOrder(node.id, 'backward')}
                    tooltip="Send backward"
                  >
                    ↓
                  </LayerControl>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {draggingId ? (
        <p className="sr-only" role="status">
          Drop on a frame to nest. Hold Alt while dropping to reorder beside it.
        </p>
      ) : null}
    </section>
  );
}

function LayerControl({
  label,
  tooltip,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <span className="group/layer-control relative flex">
      <button
        aria-label={label}
        className="flex h-7 w-7 items-center justify-center rounded text-[10px] text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
        onClick={onClick}
        title={tooltip}
        type="button"
      >
        {children}
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded bg-ink px-2 py-1 text-[10px] font-medium text-surface opacity-0 shadow-lg transition-opacity group-hover/layer-control:opacity-100 group-focus-within/layer-control:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}

function buildRows(
  nodes: readonly ComponentNode[],
  collapsedIds: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
): LayerRow[] {
  const rows: LayerRow[] = [];
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]!;
    rows.push({ node, depth, parentId });
    if (node.type === 'container' && !collapsedIds.has(node.id)) {
      rows.push(...buildRows(node.children, collapsedIds, depth + 1, node.id));
    }
  }
  return rows;
}
