import type { ComponentNode } from '@domain/entities/componentNode';
import type { ScreenFrameSize } from '../renderer/ScreenFrame';

/**
 * Preset layout rule: content is centered horizontally inside the device
 * frame. A preset change shifts every top-level node by the same offset, so
 * relative composition is preserved (a left-aligned group stays left-aligned,
 * just centered as a group). Vertical positions are intentionally untouched —
 * pages stay anchored to the top as the frame height changes.
 *
 * Hidden nodes are ignored when measuring the group, but still move with it so
 * showing them later keeps the composition intact.
 */
export function centerNodesForViewport(
  nodes: ComponentNode[],
  viewport: ScreenFrameSize,
): ComponentNode[] {
  const visible = nodes.filter((node) => !node.isHidden);
  if (visible.length === 0) {
    return nodes;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (const node of visible) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.w);
  }

  const contentWidth = maxX - minX;
  // Content wider than the frame cannot be centered without clipping its
  // leading edge; left-align it instead so the start stays reachable.
  const offset = contentWidth >= viewport.width
    ? Math.round(-minX)
    : Math.round((viewport.width - contentWidth) / 2 - minX);

  if (offset === 0) {
    return nodes;
  }

  return nodes.map((node) => ({ ...node, x: node.x + offset }));
}
