import {
  childGeometriesAtBreakpoint,
  geometryAtBreakpoint,
  isChildBearingNode,
  isHiddenAtBreakpoint,
  isMainAxisLayoutNode,
  type ChildBearingNode,
  type ComponentNode,
  type NodeGeometry,
  type ResponsiveBreakpoint,
} from './entities/componentNode';

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
  breakpoint: ResponsiveBreakpoint = 'mobile',
): ComponentTreeLocation | null {
  return locateNode(nodes, nodeId, null, 0, 0, null, null, breakpoint);
}

/**
 * Finds the deepest unlocked direct-manipulation frame under a design-space
 * point. ListView children belong to a separate item-design scope, so a
 * ListView is deliberately neither a drop target nor traversed here.
 */
export function findFrameAtPoint(
  nodes: readonly ComponentNode[],
  x: number,
  y: number,
  excludeNodeId?: string,
  breakpoint: ResponsiveBreakpoint = 'mobile',
): FrameHit | null {
  let match: FrameHit | null = null;
  function visit(
    list: readonly ComponentNode[],
    originX: number,
    originY: number,
    ancestorBlocked: boolean,
    geometryOverrides?: ReadonlyMap<string, NodeGeometry>,
  ): void {
    for (const node of list) {
      if (node.id === excludeNodeId || isHiddenAtBreakpoint(node, breakpoint)) {
        continue;
      }
      const geometry = geometryOverrides?.get(node.id) ?? geometryAtBreakpoint(node, breakpoint);
      const absoluteX = originX + geometry.x;
      const absoluteY = originY + geometry.y;
      const blocked = ancestorBlocked || node.isLocked === true;
      if (isChildBearingNode(node) && node.type !== 'listview') {
        const contains =
          x >= absoluteX &&
          x <= absoluteX + geometry.w &&
          y >= absoluteY &&
          y <= absoluteY + geometry.h;
        if (contains && !blocked) {
          match = { id: node.id, x: absoluteX, y: absoluteY, w: geometry.w, h: geometry.h };
          visit(
            node.children,
            absoluteX,
            absoluteY,
            blocked,
            childGeometriesAtBreakpoint(node, breakpoint, geometry),
          );
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
  _breakpoint: ResponsiveBreakpoint = 'mobile',
): readonly ComponentNode[] {
  const source = locateNode(nodes, nodeId);
  if (!source || source.parentId === parentId) {
    return nodes;
  }
  const parent = parentId ? locateNode(nodes, parentId) : null;
  if (
    parentId &&
    (!parent || !isChildBearingNode(parent.node) || parent.node.isLocked || containsNode(source.node, parentId))
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
  if (!parentAfterDetach || !isChildBearingNode(parentAfterDetach.node)) {
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
  if (position === 'inside' && (!isChildBearingNode(target.node) || target.node.isLocked)) {
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

  if (position === 'inside' && isChildBearingNode(targetAfterDetach.node)) {
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
  // Free-form stacks are painted topmost-first, so document arrays store
  // back-to-front and "before" in Layers inserts after the target. Row and
  // Column children use array order as layout order, so "before" inserts
  // directly before the target instead.
  const targetParent = targetAfterDetach.parentId
    ? locateNode(detached.nodes, targetAfterDetach.parentId)?.node ?? null
    : null;
  const insertIndex = targetParent && isMainAxisLayoutNode(targetParent)
    ? targetAfterDetach.index
    : targetAfterDetach.index + 1;
  return insertAtParent(
    detached.nodes,
    targetAfterDetach.parentId,
    insertIndex,
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
  breakpoint: ResponsiveBreakpoint = 'mobile',
  geometryOverrides?: ReadonlyMap<string, NodeGeometry>,
): ComponentTreeLocation | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    const geometry = geometryOverrides?.get(node.id) ?? geometryAtBreakpoint(node, breakpoint);
    const absoluteX = parentAbsoluteX + geometry.x;
    const absoluteY = parentAbsoluteY + geometry.y;
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
    if (isChildBearingNode(node)) {
      const nested = locateNode(
        node.children,
        nodeId,
        node.id,
        absoluteX,
        absoluteY,
        geometry.w,
        geometry.h,
        breakpoint,
        childGeometriesAtBreakpoint(node, breakpoint, geometry),
      );
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function containsNode(node: ComponentNode, nodeId: string): boolean {
  return isChildBearingNode(node)
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
    if (!isChildBearingNode(node)) {
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
    if (node.id === frameId && isChildBearingNode(node)) {
      return { ...node, children: [...node.children, moving] };
    }
    if (isChildBearingNode(node)) {
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
    if (node.id === parentId && isChildBearingNode(node)) {
      changed = true;
      return {
        ...node,
        children: [...node.children.slice(0, index), moving, ...node.children.slice(index)],
      };
    }
    if (isChildBearingNode(node)) {
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

/**
 * For a Row or Column parent, returns the child index at which a point should
 * be inserted so the new child lands next to the pointer. Free-form parents
 * always append. Hidden children are skipped so they do not create phantom
 * insertion slots.
 */
export function findMainAxisInsertIndex(
  parent: ChildBearingNode,
  localX: number,
  localY: number,
  breakpoint: ResponsiveBreakpoint = 'mobile',
): number {
  if (!isMainAxisLayoutNode(parent)) {
    return parent.children.length;
  }
  const geometries = childGeometriesAtBreakpoint(parent, breakpoint);
  const horizontal = parent.type === 'row';
  let insertAt = parent.children.length;
  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index]!;
    if (isHiddenAtBreakpoint(child, breakpoint)) {
      continue;
    }
    const geometry = geometries.get(child.id);
    const midpoint = horizontal
      ? (geometry?.x ?? 0) + (geometry?.w ?? 0) / 2
      : (geometry?.y ?? 0) + (geometry?.h ?? 0) / 2;
    const coordinate = horizontal ? localX : localY;
    if (coordinate < midpoint) {
      insertAt = index;
      break;
    }
  }
  return Math.max(0, Math.min(insertAt, parent.children.length));
}
