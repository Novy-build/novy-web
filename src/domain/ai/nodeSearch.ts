import type { ComponentNode } from '../entities/componentNode';

/**
 * Depth-first node lookups over a screen tree (top-level nodes plus container
 * children). Shared by the demo assistant when it scans the active screen.
 */
export function findNodeById(
  nodes: readonly ComponentNode[],
  nodeId: string,
): ComponentNode | undefined {
  return findFirstNode(nodes, (node) => node.id === nodeId);
}

export function findFirstNode<T extends ComponentNode>(
  nodes: readonly ComponentNode[],
  predicate: (node: ComponentNode) => node is T,
): T | undefined;
export function findFirstNode(
  nodes: readonly ComponentNode[],
  predicate: (node: ComponentNode) => boolean,
): ComponentNode | undefined;
export function findFirstNode(
  nodes: readonly ComponentNode[],
  predicate: (node: ComponentNode) => boolean,
): ComponentNode | undefined {
  for (const node of nodes) {
    if (predicate(node)) {
      return node;
    }
    if (node.type === 'container') {
      const child = findFirstNode(node.children, predicate);
      if (child) {
        return child;
      }
    }
  }
  return undefined;
}
