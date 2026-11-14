import type { ComponentNode } from '../entities/componentNode';

export function websiteSections(nodes: readonly ComponentNode[]): ComponentNode[] {
  return nodes.filter((node) => node.type === 'column');
}

export function moveWebsiteSection(
  nodes: readonly ComponentNode[],
  nodeId: string,
  direction: 'up' | 'down',
): ComponentNode[] {
  const sectionIndexes = nodes
    .map((node, index) => node.type === 'column' ? index : -1)
    .filter((index) => index >= 0);
  const currentPosition = sectionIndexes.findIndex((index) => nodes[index]?.id === nodeId);
  const targetPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
  if (currentPosition < 0 || targetPosition < 0 || targetPosition >= sectionIndexes.length) {
    return [...nodes];
  }
  const next = [...nodes];
  const currentIndex = sectionIndexes[currentPosition]!;
  const targetIndex = sectionIndexes[targetPosition]!;
  [next[currentIndex], next[targetIndex]] = [next[targetIndex]!, next[currentIndex]!];
  return next;
}
