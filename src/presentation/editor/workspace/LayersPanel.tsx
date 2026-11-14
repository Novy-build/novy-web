import { useState, type DragEvent, type KeyboardEvent } from 'react';
import type { ChildBearingNode, ComponentNode, ListViewNode, ResponsiveBreakpoint } from '@domain/entities/componentNode';
import { isChildBearingNode, isHiddenAtBreakpoint, isMainAxisLayoutNode } from '@domain/entities/componentNode';
import type { LayerDropPosition } from '@domain/componentTree';
import { nodeDisplayLabel, nodeLayerName } from './nodeLabels';
import { LayerOrderMenu } from './LayerOrderMenu';

interface LayersPanelProps {
  nodes: readonly ComponentNode[];
  /** Synthetic root layer for the focused item frame, shown above template children. */
  frame?: ListViewNode | null;
  device?: ResponsiveBreakpoint;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onOrder: (nodeId: string, direction: 'forward' | 'backward' | 'front' | 'back') => void;
  onRename: (nodeId: string, name: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onMove: (nodeId: string, targetId: string, position: LayerDropPosition) => void;
  isEmbedded?: boolean;
  /** Website page roots are a vertical section sequence, not a paint stack. */
  isRootMainAxis?: boolean;
}

interface LayerRow {
  node: ComponentNode;
  depth: number;
  parentId: string | null;
  isMainAxisParent: boolean;
  isFront: boolean;
  isBack: boolean;
}

function acceptsDirectChildren(node: ComponentNode): node is ChildBearingNode {
  return isChildBearingNode(node) && node.type !== 'listview';
}

const TYPE_ICONS: Readonly<Record<ComponentNode['type'], string>> = {
  button: '▭',
  text: 'T',
  input: '⌨',
  image: '◇',
  container: '#',
  'gesture-detector': '◎',
  column: '↕',
  row: '↔',
  listview: '☷',
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
  frame = null,
  device = 'mobile',
  selectedNodeId,
  onSelect,
  onOrder,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onMove,
  isEmbedded = false,
  isRootMainAxis = false,
}: LayersPanelProps) {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: LayerDropPosition;
  } | null>(null);
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    name: string;
    isMainAxisParent: boolean;
    isFront: boolean;
    isBack: boolean;
    trigger: HTMLElement;
  } | null>(null);
  const rows = buildRows(nodes, collapsedIds, frame ? 1 : 0, null, isRootMainAxis);
  const frameCollapsed = frame ? collapsedIds.has(frame.id) : false;

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
    if (event.shiftKey) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onOrder(row.node.id, row.isMainAxisParent ? 'back' : 'front');
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onOrder(row.node.id, row.isMainAxisParent ? 'front' : 'back');
        return;
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onOrder(row.node.id, row.isMainAxisParent ? 'backward' : 'forward');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onOrder(row.node.id, row.isMainAxisParent ? 'forward' : 'backward');
    } else if (event.key === 'ArrowRight') {
      const rowAbove = rows[index - 1];
      if (rowAbove && acceptsDirectChildren(rowAbove.node) && !rowAbove.node.isLocked) {
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
        acceptsDirectChildren(target) && !event.altKey ? 'inside' : 'before';
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
      {!frame && rows.length === 0 ? (
        <p className="p-2 text-sm text-ink-muted" role="status">
          No components yet — add one from Assets.
        </p>
      ) : (
        <ul aria-label="Component layers" className="grid gap-0.5" role="tree">
          {frame ? (
            <li
              aria-expanded={!frameCollapsed}
              aria-level={1}
              aria-pressed={frame.id === selectedNodeId}
              className={`group flex min-h-8 items-center gap-0.5 rounded-md border border-transparent pr-1 transition-colors ${
                frame.id === selectedNodeId ? 'border-brand-500/60 bg-brand-500/15' : 'hover:bg-canvas'
              }`}
              data-testid={`layer-row-${frame.id}`}
              role="treeitem"
            >
              <button
                aria-expanded={!frameCollapsed}
                aria-label={`${frameCollapsed ? 'Expand' : 'Collapse'} Item frame`}
                className="flex h-6 w-5 shrink-0 items-center justify-center text-[10px] text-ink-muted"
                onClick={() => {
                  const next = new Set(collapsedIds);
                  if (next.has(frame.id)) next.delete(frame.id);
                  else next.add(frame.id);
                  setCollapsedIds(next);
                }}
                type="button"
              >
                {frameCollapsed ? '›' : '⌄'}
              </button>
              <span aria-hidden="true" className="w-4 shrink-0 text-center text-[11px] text-ink-muted">
                {TYPE_ICONS.listview}
              </span>
              <button
                aria-label="Item frame"
                aria-pressed={frame.id === selectedNodeId}
                className="min-w-0 flex-1 truncate px-1 py-1 text-left text-xs font-medium text-ink"
                onClick={() => onSelect(frame.id)}
                type="button"
              >
                Item frame
                <span className="ml-2 rounded bg-brand-500/10 px-1 text-[10px] font-medium text-brand-700">auto</span>
              </button>
            </li>
          ) : null}
          {!frameCollapsed
            ? rows.map((row, index) => {
            const { node, depth } = row;
            const isSelected = node.id === selectedNodeId;
            const isCollapsed = collapsedIds.has(node.id);
            return (
              <li
                aria-expanded={acceptsDirectChildren(node) ? !isCollapsed : undefined}
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
                      position: acceptsDirectChildren(node) && !event.altKey ? 'inside' : 'before',
                    });
                  }
                }}
                onDragStart={(event) => handleDragStart(event, node)}
                onDrop={(event) => handleDrop(event, node)}
                role="treeitem"
                style={{ paddingLeft: depth * 14 + 2 }}
              >
                {acceptsDirectChildren(node) ? (
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
                    title="F2 rename · Alt+↑/↓ reorder · Alt+Shift+↑/↓ to front/back · Alt+→/← nest"
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
                    label={row.isMainAxisParent ? `Move ${nodeLayerName(node)} earlier` : `Bring ${nodeLayerName(node)} forward`}
                    onClick={() => onOrder(node.id, row.isMainAxisParent ? 'backward' : 'forward')}
                    tooltip={row.isMainAxisParent ? 'Move earlier' : 'Bring forward'}
                  >
                    ↑
                  </LayerControl>
                  <LayerControl
                    label={row.isMainAxisParent ? `Move ${nodeLayerName(node)} later` : `Send ${nodeLayerName(node)} backward`}
                    onClick={() => onOrder(node.id, row.isMainAxisParent ? 'forward' : 'backward')}
                    tooltip={row.isMainAxisParent ? 'Move later' : 'Send backward'}
                  >
                    ↓
                  </LayerControl>
                  <button
                    aria-expanded={openMenu?.id === node.id}
                    aria-haspopup="menu"
                    aria-label={`Layer order for ${nodeLayerName(node)}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-[10px] text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
                    onClick={(event) => {
                      if (openMenu?.id === node.id) {
                        setOpenMenu(null);
                        return;
                      }
                      setOpenMenu({
                        id: node.id,
                        name: nodeLayerName(node),
                        isMainAxisParent: row.isMainAxisParent,
                        isFront: row.isFront,
                        isBack: row.isBack,
                        trigger: event.currentTarget,
                      });
                    }}
                    title="Layer order"
                    type="button"
                  >
                    ⋯
                  </button>
                </div>
              </li>
            );
          }) : null}
          {frame && !frameCollapsed && nodes.length === 0 ? (
            <li className="p-2 text-sm text-ink-muted" role="status">
              This item frame is empty — add a component from Assets.
            </li>
          ) : null}
        </ul>
      )}
      {openMenu ? (
        <LayerOrderMenu
          isBack={openMenu.isBack}
          isFront={openMenu.isFront}
          isMainAxisParent={openMenu.isMainAxisParent}
          nodeName={openMenu.name}
          onBack={() => onOrder(openMenu.id, 'back')}
          onClose={() => setOpenMenu(null)}
          onFront={() => onOrder(openMenu.id, 'front')}
          trigger={openMenu.trigger}
        />
      ) : null}
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
  isMainAxisParent = false,
): LayerRow[] {
  const rows: LayerRow[] = [];
  // Free-form stacks are painted topmost-first (array is back-to-front), so
  // walk them backward. Row/Column children are laid out in array order, so
  // walk them forward to match the canvas.
  const start = isMainAxisParent ? 0 : nodes.length - 1;
  const end = isMainAxisParent ? nodes.length : -1;
  const step = isMainAxisParent ? 1 : -1;
  for (let index = start; index !== end; index += step) {
    const node = nodes[index]!;
    rows.push({
      node,
      depth,
      parentId,
      isMainAxisParent,
      isFront: index === nodes.length - 1,
      isBack: index === 0,
    });
    if (acceptsDirectChildren(node) && !collapsedIds.has(node.id)) {
      rows.push(...buildRows(node.children, collapsedIds, depth + 1, node.id, isMainAxisLayoutNode(node)));
    }
  }
  return rows;
}
