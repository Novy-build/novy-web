import type { ComponentNode, ComponentType } from '@domain/entities/componentNode';
import { createComponentNode, getDefaultNodeSize } from '@domain/factories/componentNode';
import { generateId } from '@domain/ids';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type { ScreenFrameSize } from '@presentation/editor/renderer/ScreenFrame';
import { clampNodeToBounds, deviceViewport, snapOrRaw } from './geometry';
import {
  createEditorState,
  findNodeInScreen,
  getActiveScreen,
  ZOOM_LIMITS,
  type EditorAction,
  type EditorState,
} from './editorState';

/*
 * History policy: every mutating action pushes exactly one history entry,
 * except node/move and node/resize. Dragging dispatches node/dragStart once
 * per drag session (pointer capture), so a full drag = exactly one undo step
 * while intermediate frames stay cheap.
 */
const MAX_HISTORY = 50;

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'document/set':
      return createEditorState(action.document);

    // Screens -----------------------------------------------------------------
    case 'screen/select': {
      const exists = state.document.screens.some((screen) => screen.id === action.screenId);
      if (!exists) {
        return state;
      }
      return { ...state, activeScreenId: action.screenId, selectedNodeId: null };
    }

    case 'screen/add':
      return pushHistory(state, (document) => {
        const screen: Screen = {
          id: generateId('screen'),
          name: `Screen ${document.screens.length + 1}`,
          nodes: [],
          behaviors: [],
          logicGraphs: [],
        };
        return {
          ...state,
          document: { screens: [...document.screens, screen] },
          activeScreenId: screen.id,
          selectedNodeId: null,
        } as EditorState;
      });

    case 'screen/rename': {
      const trimmedName = action.name.trim();
      if (trimmedName.length === 0) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, action.screenId, (screen) => ({ ...screen, name: trimmedName })),
      }) as EditorState);
    }

    case 'screen/delete': {
      if (state.document.screens.length <= 1) {
        return state;
      }
      return pushHistory(state, (document) => {
        const remaining = document.screens.filter((screen) => screen.id !== action.screenId);
        return {
          ...state,
          document: { screens: remaining },
          activeScreenId:
            state.activeScreenId === action.screenId ? remaining[0].id : state.activeScreenId,
          selectedNodeId: null,
        } as EditorState;
      });
    }

    // Selection & nodes -------------------------------------------------------
    case 'node/select':
      return { ...state, selectedNodeId: action.nodeId };

    case 'node/add':
    case 'canvas/dropAt':
      return addNode(state, action.nodeType, action.x, action.y);

    case 'node/dragStart':
      return pushHistory(state, () => state);

    case 'node/move':
      return updateNode(state, action.nodeId, (node) => {
        const bounds = deviceViewport(state.device);
        const next = clampNodeToBounds(
          { x: Math.round(action.x), y: Math.round(action.y), w: node.w, h: node.h },
          bounds,
        );
        return { ...node, x: next.x, y: next.y };
      });

    case 'node/resize':
      return updateNode(state, action.nodeId, (node) => ({
        ...node,
        x: Math.round(action.geometry.x),
        y: Math.round(action.geometry.y),
        w: Math.round(action.geometry.w),
        h: Math.round(action.geometry.h),
      }));

    case 'node/nudge': {
      if (!findNodeInScreen(getActiveScreen(state), action.nodeId)) {
        return state;
      }
      return pushHistory(state, (document) => {
        const bounds = deviceViewport(state.device);
        return {
          ...state,
          document: replaceScreen(document, state.activeScreenId, (candidate) => ({
            ...candidate,
            nodes: remapTree(candidate.nodes, action.nodeId, applyNudge(findNodeInScreen(candidate, action.nodeId)!, action.dx, action.dy, bounds)),
          })),
        } as EditorState;
      });
    }

    case 'node/props-button':
      return updateNode(state, action.nodeId, (node) =>
        node.type === 'button' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-text':
      return updateNode(state, action.nodeId, (node) =>
        node.type === 'text' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-input':
      return updateNode(state, action.nodeId, (node) =>
        node.type === 'input' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-image':
      return updateNode(state, action.nodeId, (node) =>
        node.type === 'image' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-list':
      return updateNode(state, action.nodeId, (node) =>
        node.type === 'list' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/duplicate':
      return duplicateNode(state, action.nodeId);

    case 'node/delete':
      return deleteNode(state, action.nodeId);

    case 'node/order': {
      const preCheck = getActiveScreen(state);
      const reordered = reorderInTree(preCheck.nodes, action.nodeId, action.direction);
      if (reordered === preCheck.nodes) {
        return state; // boundary: nothing moves, no history entry
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (candidate) => ({
          ...candidate,
          nodes: [...reorderInTree(candidate.nodes, action.nodeId, action.direction)],
        })),
      }) as EditorState);
    }

    // Canvas chrome -----------------------------------------------------------
    case 'canvas/dropIndicator':
      return { ...state, dropIndicator: action.position };

    case 'device/set':
      return { ...state, device: action.device, selectedNodeId: null };

    case 'zoom/set':
      return {
        ...state,
        zoom: Math.min(Math.max(action.zoom, ZOOM_LIMITS.min), ZOOM_LIMITS.max),
      };

    case 'snap/toggle':
      return { ...state, isSnapEnabled: !state.isSnapEnabled };

    // Autosave ----------------------------------------------------------------
    case 'autosave/begin':
      return { ...state, isSaving: true };

    case 'autosave/end':
      return { ...state, isSaving: false, hasUnsavedChanges: false, lastSavedAt: action.savedAt };

    // History -----------------------------------------------------------------
    case 'history/undo':
      return undo(state);

    case 'history/redo':
      return redo(state);

    default:
      return state;
  }
}

// -- internals -----------------------------------------------------------------

function pushHistory(state: EditorState, produce: (document: ProjectDocument) => EditorState): EditorState {
  const next = produce(state.document);
  return {
    ...next,
    past: [...state.past, structuredClone(state.document)].slice(-MAX_HISTORY),
    future: [],
    hasUnsavedChanges: true,
  };
}

function undo(state: EditorState): EditorState {
  if (state.past.length === 0) {
    return state;
  }
  const previous = state.past[state.past.length - 1];
  return {
    ...state,
    document: previous,
    past: state.past.slice(0, -1),
    future: [structuredClone(state.document), ...state.future],
    selectedNodeId: selectionStillExists(previous, state.activeScreenId, state.selectedNodeId),
    hasUnsavedChanges: true,
  };
}

function redo(state: EditorState): EditorState {
  if (state.future.length === 0) {
    return state;
  }
  const next = state.future[0];
  return {
    ...state,
    document: next,
    past: [...state.past, structuredClone(state.document)],
    future: state.future.slice(1),
    selectedNodeId: selectionStillExists(next, state.activeScreenId, state.selectedNodeId),
    hasUnsavedChanges: true,
  };
}

function selectionStillExists(
  document: ProjectDocument,
  activeScreenId: string,
  selectedNodeId: string | null,
): string | null {
  if (!selectedNodeId) {
    return null;
  }
  const screen = document.screens.find((candidate) => candidate.id === activeScreenId);
  if (screen && findNodeInScreen(screen, selectedNodeId)) {
    return selectedNodeId;
  }
  return null;
}

function addNode(state: EditorState, nodeType: ComponentType, rawX: number, rawY: number): EditorState {
  const bounds = deviceViewport(state.device);
  const { w, h } = getDefaultNodeSize(nodeType);
  const geometry = clampNodeToBounds(
    {
      x: snapOrRaw(rawX - w / 2, state.isSnapEnabled),
      y: snapOrRaw(rawY - h / 2, state.isSnapEnabled),
      w,
      h,
    },
    bounds,
  );

  return pushHistory(state, (document) => {
    const node = { ...createComponentNode(nodeType), ...geometry };
    return {
      ...state,
      document: replaceScreen(document, state.activeScreenId, (screen) => ({
        ...screen,
        nodes: [...screen.nodes, node],
      })),
      selectedNodeId: node.id,
      dropIndicator: null,
    } as EditorState;
  });
}

function updateNode(
  state: EditorState,
  nodeId: string,
  transform: (node: ComponentNode) => ComponentNode,
): EditorState {
  const screen = getActiveScreen(state);
  const node = findNodeInScreen(screen, nodeId);
  if (!node) {
    return state;
  }
  const replacement = transform(node);
  if (replacement === node) {
    return state;
  }
  return {
    ...state,
    document: replaceScreen(state.document, state.activeScreenId, (candidate) => ({
      ...candidate,
      nodes: remapTree(candidate.nodes, nodeId, replacement),
    })),
    hasUnsavedChanges: true,
  };
}

function duplicateNode(state: EditorState, nodeId: string): EditorState {
  const screen = getActiveScreen(state);
  const source = findNodeInScreen(screen, nodeId);
  if (!source) {
    return state;
  }

  return pushHistory(state, (document) => {
    const copy = cloneWithFreshIds(source);
    const bounds = deviceViewport(state.device);
    // +16 with no re-snap: duplicates stay axis-aligned with their source
    // even when the source itself sits between grid lines.
    const geometry = clampNodeToBounds(
      { x: source.x + 16, y: source.y + 16, w: copy.w, h: copy.h },
      bounds,
    );
    const placed = { ...copy, ...geometry };

    return {
      ...state,
      document: replaceScreen(document, state.activeScreenId, (candidate) => ({
        ...candidate,
        nodes: insertSiblingInTree(candidate.nodes, source.id, placed),
      })),
      selectedNodeId: placed.id,
    } as EditorState;
  });
}

function deleteNode(state: EditorState, nodeId: string): EditorState {
  const screen = getActiveScreen(state);
  if (!findNodeInScreen(screen, nodeId)) {
    return state;
  }

  return pushHistory(state, (document) => ({
    ...state,
    document: replaceScreen(document, state.activeScreenId, (candidate) => ({
      ...candidate,
      nodes: pruneNode(candidate.nodes, nodeId),
    })),
    selectedNodeId: null,
  }) as EditorState);
}

function applyNudge(
  node: ComponentNode,
  dx: number,
  dy: number,
  bounds: ScreenFrameSize,
): ComponentNode {
  const next = clampNodeToBounds(
    { x: Math.round(node.x + dx), y: Math.round(node.y + dy), w: node.w, h: node.h },
    bounds,
  );
  return { ...node, x: next.x, y: next.y };
}

function replaceScreen(
  document: ProjectDocument,
  screenId: string,
  transform: (screen: Screen) => Screen,
): ProjectDocument {
  return {
    screens: document.screens.map((screen) => (screen.id === screenId ? transform(screen) : screen)),
  };
}

/** Rebuilds the node tree, replacing the node with the given id (nested too). */
function remapTree(nodes: readonly ComponentNode[], nodeId: string, replacement: ComponentNode): ComponentNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return replacement;
    }
    if (node.type === 'container') {
      return { ...node, children: remapTree(node.children, nodeId, replacement) };
    }
    return node;
  });
}

/** Inserts a copy directly after its source node, inside the same container. */
function insertSiblingInTree(
  nodes: readonly ComponentNode[],
  sourceNodeId: string,
  copy: ComponentNode,
): ComponentNode[] {
  const insertHere = (list: readonly ComponentNode[]): ComponentNode[] => {
    const result: ComponentNode[] = [];
    for (const node of list) {
      result.push(node);
      if (node.id === sourceNodeId) {
        result.push(copy);
      }
    }
    return result;
  };

  if (nodes.some((node) => node.id === sourceNodeId)) {
    return insertHere(nodes);
  }
  return nodes.map((node) =>
    node.type === 'container'
      ? { ...node, children: insertSiblingInTree(node.children, sourceNodeId, copy) }
      : node,
  );
}

function pruneNode(nodes: readonly ComponentNode[], nodeId: string): ComponentNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) =>
      node.type === 'container' ? { ...node, children: pruneNode(node.children, nodeId) } : node,
    );
}

/** Swaps a node forward/backward within its sibling list (z-order controls).
 *  Returns the same array reference when the node sits at a boundary, so the
 *  reducer can skip the history entry entirely. */
function reorderInTree(
  nodes: readonly ComponentNode[],
  nodeId: string,
  direction: 'forward' | 'backward',
): readonly ComponentNode[] {
  const sourceIndex = nodes.findIndex((node) => node.id === nodeId);
  if (sourceIndex !== -1) {
    const targetIndex = direction === 'forward' ? sourceIndex + 1 : sourceIndex - 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) {
      return nodes;
    }
    const copy = [...nodes];
    const moving = copy[sourceIndex];
    copy[sourceIndex] = copy[targetIndex];
    copy[targetIndex] = moving;
    return copy;
  }

  let changed = false;
  const mapped = nodes.map((node) => {
    if (node.type === 'container') {
      const nextChildren = reorderInTree(node.children, nodeId, direction);
      if (nextChildren !== node.children) {
        changed = true;
        return { ...node, children: [...nextChildren] };
      }
    }
    return node;
  });
  return changed ? mapped : nodes;
}

function cloneWithFreshIds(node: ComponentNode): ComponentNode {
  const clone = structuredClone(node) as ComponentNode;
  const reassign = (target: ComponentNode): ComponentNode => {
    const next = { ...target, id: generateId('node') };
    if (next.type === 'container') {
      next.children = next.children.map((child) => reassign(child));
    }
    return next;
  };
  return reassign(clone);
}
