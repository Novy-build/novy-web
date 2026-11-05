import type { ComponentNode } from './entities/componentNode';

export type LayerDropPosition = 'before' | 'inside';

export interface ComponentTreeLocation {
  node: ComponentNode;
  parentId: string | null;
  index: number;
  absoluteX: number;
  absoluteY: number;
  parentAbsoluteX: number;
  parentAbsoluteY: number;
  parentWidth: number | null;
  parentHeight: number | null;
}

export interface FrameHit {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getComponentTreeLocation(
  nodes: readonly ComponentNode[],
  nodeId: string,
): ComponentTreeLocation | null {
  return locateNode(nodes, nodeId);
}

/** Finds the deepest unlocked frame under a design-space point. */
export function findFrameAtPoint(
  nodes: readonly ComponentNode[],
  x: number,
  y: number,
  excludeNodeId?: string,
): FrameHit | null {
  let match: FrameHit | null = null;
  function visit(
    list: readonly ComponentNode[],
    originX: number,
    originY: number,
    ancestorBlocked: boolean,
  ): void {
    for (const node of list) {
      if (node.id === excludeNodeId || node.isHidden) {
        continue;
      }
      const absoluteX = originX + node.x;
      const absoluteY = originY + node.y;
      const blocked = ancestorBlocked || node.isLocked === true;
      if (node.type === 'container') {
        const contains =
          x >= absoluteX &&
          x <= absoluteX + node.w &&
          y >= absoluteY &&
          y <= absoluteY + node.h;
        if (contains && !blocked) {
          match = { id: node.id, x: absoluteX, y: absoluteY, w: node.w, h: node.h };
          visit(node.children, absoluteX, absoluteY, blocked);
        }
      }
    }
  }
  visit(nodes, 0, 0, false);
  return match;
}

/** Reparents to a frame or the screen root while preserving absolute position. */
export function reparentLayerInTree(
  nodes: readonly ComponentNode[],
  nodeId: string,
  parentId: string | null,
  absolutePosition?: { x: number; y: number },
): readonly ComponentNode[] {
  const source = locateNode(nodes, nodeId);
  if (!source || source.parentId === parentId) {
    return nodes;
  }
  const parent = parentId ? locateNode(nodes, parentId) : null;
  if (
    parentId &&
    (!parent || parent.node.type !== 'container' || parent.node.isLocked || containsNode(source.node, parentId))
  ) {
    return nodes;
  }
  const detached = detachNode(nodes, nodeId);
  if (!detached.removed) {
    return nodes;
  }
  const absoluteX = absolutePosition?.x ?? source.absoluteX;
  const absoluteY = absolutePosition?.y ?? source.absoluteY;
  if (parentId === null) {
    return [
      ...detached.nodes,
      withRelativePosition(detached.removed, absoluteX, absoluteY),
    ];
  }
  const parentAfterDetach = locateNode(detached.nodes, parentId);
  if (!parentAfterDetach || parentAfterDetach.node.type !== 'container') {
    return nodes;
  }
  return insertIntoFrame(
    detached.nodes,
    parentId,
    withRelativePosition(
      detached.removed,
      absoluteX - parentAfterDetach.absoluteX,
      absoluteY - parentAfterDetach.absoluteY,
    ),
  );
}

/**
 * Moves one layer before another visible layer or inside a frame while
 * preserving its absolute canvas position. Invalid/self-descendant moves are
 * reference-preserving no-ops so reducers can avoid phantom history entries.
 */
export function moveLayerInTree(
  nodes: readonly ComponentNode[],
  nodeId: string,
  targetId: string,
  position: LayerDropPosition,
): readonly ComponentNode[] {
  if (nodeId === targetId) {
    return nodes;
  }
  const source = locateNode(nodes, nodeId);
  const target = locateNode(nodes, targetId);
  if (!source || !target || containsNode(source.node, targetId)) {
    return nodes;
  }
  if (position === 'inside' && (target.node.type !== 'container' || target.node.isLocked)) {
    return nodes;
  }

  const detached = detachNode(nodes, nodeId);
  if (!detached.removed) {
    return nodes;
  }
  const targetAfterDetach = locateNode(detached.nodes, targetId);
  if (!targetAfterDetach) {
    return nodes;
  }

  if (position === 'inside' && targetAfterDetach.node.type === 'container') {
    const moved = withRelativePosition(
      detached.removed,
      source.absoluteX - targetAfterDetach.absoluteX,
      source.absoluteY - targetAfterDetach.absoluteY,
    );
    return insertIntoFrame(detached.nodes, targetId, moved);
  }

  const moved = withRelativePosition(
    detached.removed,
    source.absoluteX - targetAfterDetach.parentAbsoluteX,
    source.absoluteY - targetAfterDetach.parentAbsoluteY,
  );
  // Layer rows are painted topmost-first, while document arrays store
  // back-to-front. "Before" in Layers therefore inserts after the target.
  return insertAtParent(
    detached.nodes,
    targetAfterDetach.parentId,
    targetAfterDetach.index + 1,
    moved,
  );
}

function locateNode(
  nodes: readonly ComponentNode[],
  nodeId: string,
  parentId: string | null = null,
  parentAbsoluteX = 0,
  parentAbsoluteY = 0,
  parentWidth: number | null = null,
  parentHeight: number | null = null,
): ComponentTreeLocation | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    const absoluteX = parentAbsoluteX + node.x;
    const absoluteY = parentAbsoluteY + node.y;
    if (node.id === nodeId) {
      return {
        node,
        parentId,
        index,
        absoluteX,
        absoluteY,
        parentAbsoluteX,
        parentAbsoluteY,
        parentWidth,
        parentHeight,
      };
    }
    if (node.type === 'container') {
      const nested = locateNode(
        node.children,
        nodeId,
        node.id,
        absoluteX,
        absoluteY,
        node.w,
        node.h,
      );
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function containsNode(node: ComponentNode, nodeId: string): boolean {
  return node.type === 'container'
    ? node.children.some((child) => child.id === nodeId || containsNode(child, nodeId))
    : false;
}

function detachNode(
  nodes: readonly ComponentNode[],
  nodeId: string,
): { nodes: readonly ComponentNode[]; removed: ComponentNode | null } {
  const ownIndex = nodes.findIndex((node) => node.id === nodeId);
  if (ownIndex !== -1) {
    return {
      nodes: [...nodes.slice(0, ownIndex), ...nodes.slice(ownIndex + 1)],
      removed: nodes[ownIndex]!,
    };
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (node.type !== 'container') {
      continue;
    }
    const nested = detachNode(node.children, nodeId);
    if (nested.removed) {
      const copy = [...nodes];
      copy[index] = { ...node, children: [...nested.nodes] };
      return { nodes: copy, removed: nested.removed };
    }
  }
  return { nodes, removed: null };
}

function insertIntoFrame(
  nodes: readonly ComponentNode[],
  frameId: string,
  moving: ComponentNode,
): readonly ComponentNode[] {
  return nodes.map((node) => {
    if (node.id === frameId && node.type === 'container') {
      return { ...node, children: [...node.children, moving] };
    }
    if (node.type === 'container') {
      const children = insertIntoFrame(node.children, frameId, moving);
      return children === node.children ? node : { ...node, children: [...children] };
    }
    return node;
  });
}

function insertAtParent(
  nodes: readonly ComponentNode[],
  parentId: string | null,
  index: number,
  moving: ComponentNode,
): readonly ComponentNode[] {
  if (parentId === null) {
    return [...nodes.slice(0, index), moving, ...nodes.slice(index)];
  }
  let changed = false;
  const mapped = nodes.map((node) => {
    if (node.id === parentId && node.type === 'container') {
      changed = true;
      return {
        ...node,
        children: [...node.children.slice(0, index), moving, ...node.children.slice(index)],
      };
    }
    if (node.type === 'container') {
      const children = insertAtParent(node.children, parentId, index, moving);
      if (children !== node.children) {
        changed = true;
        return { ...node, children: [...children] };
      }
    }
    return node;
  });
  return changed ? mapped : nodes;
}

function withRelativePosition(node: ComponentNode, x: number, y: number): ComponentNode {
  return { ...node, x: Math.round(x), y: Math.round(y) };
}
