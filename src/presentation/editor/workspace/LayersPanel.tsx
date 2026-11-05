import type { ComponentNode } from '@domain/entities/componentNode';
import { nodeDisplayLabel, nodeLayerName } from './nodeLabels';

interface LayersPanelProps {
  nodes: readonly ComponentNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onOrder: (nodeId: string, direction: 'forward' | 'backward') => void;
}

interface LayerRow {
  node: ComponentNode;
  depth: number;
}

/**
 * Painted topmost-first view of the node tree (containers expand outward).
 * Rows select on click; arrows reorder through `node/order` actions.
 */
function buildRows(nodes: readonly ComponentNode[], depth = 0): LayerRow[] {
  const rows: LayerRow[] = [];
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    rows.push({ node, depth });
    if (node.type === 'container') {
      rows.push(...buildRows(node.children, depth + 1));
    }
  }
  return rows;
}

export function LayersPanel({ nodes, selectedNodeId, onSelect, onOrder }: LayersPanelProps) {
  const rows = buildRows(nodes);

  return (
    <section
      aria-label="Layers"
      className="max-h-60 shrink-0 overflow-y-auto border-t border-hairline bg-surface p-3"
    >
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Layers</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No components yet — add one from the palette.</p>
      ) : (
        <ul className="grid gap-0.5">
          {rows.map(({ node, depth }) => (
            <li
              className={`flex items-center gap-1 rounded-tile ${
                node.id === selectedNodeId ? 'bg-canvas' : ''
              }`}
              data-testid={`layer-row-${node.id}`}
              key={node.id}
              style={{ paddingLeft: depth * 12 + 4 }}
            >
              <button
                aria-label={nodeLayerName(node)}
                aria-pressed={node.id === selectedNodeId}
                className="min-w-0 flex-1 truncate rounded-tile px-1.5 py-1 text-left text-xs transition-colors hover:bg-canvas"
                onClick={() => onSelect(node.id)}
                type="button"
              >
                <span className="font-semibold text-ink-muted">{nodeDisplayLabel(node)}</span>
              </button>
              <div aria-label={`Reorder ${nodeLayerName(node)}`} className="flex shrink-0" role="group">
                <button
                  aria-label={`Bring ${nodeLayerName(node)} forward`}
                  className="px-1 text-ink-muted transition-colors hover:text-ink"
                  onClick={() => onOrder(node.id, 'forward')}
                  type="button"
                >
                  ↑
                </button>
                <button
                  aria-label={`Send ${nodeLayerName(node)} backward`}
                  className="px-1 text-ink-muted transition-colors hover:text-ink"
                  onClick={() => onOrder(node.id, 'backward')}
                  type="button"
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
