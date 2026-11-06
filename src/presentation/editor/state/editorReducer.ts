import type { ComponentNode, ComponentType } from '@domain/entities/componentNode';
import { createComponentNode, getDefaultNodeSize } from '@domain/factories/componentNode';
import { generateId } from '@domain/ids';
import type { LogicGraph } from '@domain/entities/logic';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import {
  addConnection,
  addActionNode,
  addConditionNode,
  appendAction,
  appendCondition,
  connectLogicPorts,
  disconnectLogicEdge,
  moveLogicNode,
  removeConnection,
  removeLogicNodes,
  updateAction,
  updateCondition,
} from '@domain/logic/graph';
import { pruneDeadNavigateTargets } from '@domain/logic/runtime';
import {
  createBehavior,
  createBehaviorBundle,
  createLogicGraph,
  createTriggerNode,
} from '@domain/factories/logic';
import { applyAssistantProposal } from '@domain/ai/proposal';
import {
  getComponentTreeLocation,
  moveLayerInTree,
  reparentLayerInTree,
} from '@domain/componentTree';
import type { ScreenFrameSize } from '@presentation/editor/renderer/ScreenFrame';
import { clampNodeToBounds, deviceViewport, snapOrRaw } from './geometry';
import { behaviorDisplayName } from '../logic/behaviorLabels';
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
        // Navigate steps pointing at the deleted screen become dead ends, so
        // they are pruned along with the screen itself.
        const remaining = document.screens
          .filter((screen) => screen.id !== action.screenId)
          .map((screen) => ({ ...screen, logicGraphs: pruneDeadNavigateTargets(screen.logicGraphs, action.screenId) }));
        const activeScreenId =
          state.activeScreenId === action.screenId ? remaining[0].id : state.activeScreenId;
        const activeScreen = remaining.find((screen) => screen.id === activeScreenId) ?? remaining[0];
        return {
          ...state,
          document: { screens: remaining },
          activeScreenId,
          selectedNodeId: null,
          activeBehaviorId: activeScreen.behaviors.some(
            (candidate) => candidate.id === state.activeBehaviorId,
          )
            ? state.activeBehaviorId
            : null,
        } as EditorState;
      });
    }

    // Selection & nodes -------------------------------------------------------
    case 'node/select':
      return { ...state, selectedNodeId: action.nodeId };

    case 'node/add':
      return addNode(state, action.nodeType, action.x, action.y, null);

    case 'canvas/dropAt':
      return addNode(state, action.nodeType, action.x, action.y, action.parentId ?? null);

    case 'node/dragStart':
      return pushHistory(state, () => state);

    case 'node/move':
      return updateNode(state, action.nodeId, (node) => {
        const location = getComponentTreeLocation(getActiveScreen(state).nodes, action.nodeId);
        const bounds = location?.parentWidth && location.parentHeight
          ? { width: location.parentWidth, height: location.parentHeight }
          : deviceViewport(state.device);
        const next = clampNodeToBounds(
          { x: Math.round(action.x), y: Math.round(action.y), w: node.w, h: node.h },
          bounds,
        );
        return { ...node, x: next.x, y: next.y };
      });

    case 'node/layout-position': {
      const location = getComponentTreeLocation(getActiveScreen(state).nodes, action.nodeId);
      const layoutBounds = location?.parentWidth && location.parentHeight
        ? { width: location.parentWidth, height: location.parentHeight }
        : deviceViewport(state.device);
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        ...clampNodeToBounds(
          { x: action.x, y: action.y, w: node.w, h: node.h },
          layoutBounds,
        ),
      }));
    }

    case 'node/layout-size': {
      const location = getComponentTreeLocation(getActiveScreen(state).nodes, action.nodeId);
      const layoutBounds = location?.parentWidth && location.parentHeight
        ? { width: location.parentWidth, height: location.parentHeight }
        : deviceViewport(state.device);
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        ...clampNodeToBounds(
          { x: node.x, y: node.y, w: action.w, h: action.h },
          layoutBounds,
        ),
      }));
    }

    case 'node/resize': {
      const location = getComponentTreeLocation(getActiveScreen(state).nodes, action.nodeId);
      const resizeBounds = location?.parentWidth && location.parentHeight
        ? { width: location.parentWidth, height: location.parentHeight }
        : deviceViewport(state.device);
      return updateNode(state, action.nodeId, (node) => ({
        ...node,
        ...clampNodeToBounds(
          {
            x: Math.round(action.geometry.x),
            y: Math.round(action.geometry.y),
            w: Math.round(action.geometry.w),
            h: Math.round(action.geometry.h),
          },
          resizeBounds,
        ),
      }));
    }

    case 'node/nudge': {
      const activeScreen = getActiveScreen(state);
      const location = getComponentTreeLocation(activeScreen.nodes, action.nodeId);
      if (!location) {
        return state;
      }
      return pushHistory(state, (document) => {
        const bounds = location.parentWidth && location.parentHeight
          ? { width: location.parentWidth, height: location.parentHeight }
          : deviceViewport(state.device);
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
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'button' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-text':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'text' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-input':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'input' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-image':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'image' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-list':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'list' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-form':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'form' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-checkbox':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'checkbox' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-radio':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'radio' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-switch':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'switch' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-dropdown':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'dropdown' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-slider':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'slider' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-progress':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'progress' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-divider':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'divider' ? { ...node, props: { ...node.props, ...action.props } } : node,
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

    case 'node/layer-rename':
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        name: action.name.trim() || undefined,
      }));

    case 'node/layer-visibility':
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        isHidden: node.isHidden ? undefined : true,
      }));

    case 'node/layer-lock':
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        isLocked: node.isLocked ? undefined : true,
      }));

    case 'node/reparent': {
      const activeScreen = getActiveScreen(state);
      const moved = reparentNodeForCanvas(
        activeScreen.nodes,
        action.nodeId,
        action.parentId,
        action.absolutePosition,
        deviceViewport(state.device),
      );
      if (moved === activeScreen.nodes) {
        return state;
      }
      return {
        ...state,
        document: replaceScreen(state.document, state.activeScreenId, (screen) => ({
          ...screen,
          nodes: [
            ...reparentNodeForCanvas(
              screen.nodes,
              action.nodeId,
              action.parentId,
              action.absolutePosition,
              deviceViewport(state.device),
            ),
          ],
        })),
        selectedNodeId: action.nodeId,
        hasUnsavedChanges: true,
      };
    }

    case 'node/layer-move': {
      const activeScreen = getActiveScreen(state);
      const moved = moveLayerInTree(
        activeScreen.nodes,
        action.nodeId,
        action.targetId,
        action.position,
      );
      if (moved === activeScreen.nodes) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (screen) => ({
          ...screen,
          nodes: [...moveLayerInTree(screen.nodes, action.nodeId, action.targetId, action.position)],
        })),
        selectedNodeId: action.nodeId,
      }) as EditorState);
    }

    // Canvas chrome -----------------------------------------------------------
    case 'canvas/dropIndicator':
      return { ...state, dropIndicator: action.position };

    // Logic workspace ------------------------------------------------------------
    case 'behavior/create': {
      const screen = getActiveScreen(state);
      const target = findNodeInScreen(screen, action.targetNodeId);
      if (!target) {
        return state;
      }
      const duplicated = screen.behaviors.some(
        (candidate) => candidate.targetNodeId === action.targetNodeId && candidate.event === action.event,
      );
      if (duplicated) {
        return state;
      }
      const bundle = createBehaviorBundle(behaviorDisplayName(action.event, target), action.targetNodeId, action.event);
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (candidate) => ({
          ...candidate,
          behaviors: [...candidate.behaviors, bundle.behavior],
          logicGraphs: [...candidate.logicGraphs, bundle.graph],
        })),
        activeBehaviorId: bundle.behavior.id,
      }) as EditorState);
    }

    case 'workflow/create': {
      const name = `${action.event === 'click' ? 'On click' : action.event === 'change' ? 'On change' : 'On load'} workflow`;
      const graph = createLogicGraph({
        name,
        sourceNodeId: '',
        event: action.event,
        triggerPosition: action.position,
      });
      const behavior = createBehavior(name, action.event, graph.id, '');
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (screen) => ({
          ...screen,
          behaviors: [...screen.behaviors, behavior],
          logicGraphs: [...screen.logicGraphs, graph],
        })),
        activeBehaviorId: behavior.id,
      }) as EditorState);
    }

    case 'workflow/repair-graph': {
      const screen = getActiveScreen(state);
      const behavior = screen.behaviors.find((candidate) => candidate.id === action.behaviorId);
      if (!behavior || screen.logicGraphs.some((graph) => graph.id === behavior.graphId)) {
        return state;
      }
      const graph: LogicGraph = {
        id: behavior.graphId,
        name: behavior.name,
        sourceNodeId: behavior.targetNodeId,
        nodes: [createTriggerNode(behavior.event, { x: 80, y: 160 })],
        edges: [],
      };
      return {
        ...state,
        document: replaceScreen(state.document, state.activeScreenId, (candidate) => ({
          ...candidate,
          logicGraphs: [...candidate.logicGraphs, graph],
        })),
        hasUnsavedChanges: true,
      };
    }

    case 'workflow/trigger-update': {
      const screen = getActiveScreen(state);
      const behavior = screen.behaviors.find((candidate) => candidate.id === action.behaviorId);
      if (!behavior) return state;
      const target = action.targetNodeId ? findNodeInScreen(screen, action.targetNodeId) : undefined;
      const eventLabel = action.event === 'click' ? 'On click' : action.event === 'change' ? 'On change' : 'On load';
      const name = target ? behaviorDisplayName(action.event, target) : `${eventLabel} workflow`;
      return pushHistory(state, (document) =>
        ({
          ...state,
          document: replaceScreen(document, state.activeScreenId, (candidate) => ({
            ...candidate,
            behaviors: candidate.behaviors.map((item) =>
              item.id === behavior.id
                ? { ...item, event: action.event, targetNodeId: action.targetNodeId, name }
                : item,
            ),
            logicGraphs: candidate.logicGraphs.map((graph) =>
              graph.id === behavior.graphId
                ? {
                    ...graph,
                    name,
                    sourceNodeId: action.targetNodeId,
                    nodes: graph.nodes.map((node) =>
                      node.kind === 'trigger' ? { ...node, event: action.event } : node,
                    ),
                  }
                : graph,
            ),
          })),
        }) as EditorState,
      );
    }

    case 'behavior/delete': {
      const screen = getActiveScreen(state);
      const behavior = screen.behaviors.find((candidate) => candidate.id === action.behaviorId);
      if (!behavior) {
        return state;
      }
      return pushHistory(state, (document) => {
        const remaining = screen.behaviors.filter((candidate) => candidate.id !== behavior.id);
        return {
          ...state,
          document: replaceScreen(document, state.activeScreenId, (candidate) => ({
            ...candidate,
            behaviors: candidate.behaviors.filter((kept) => kept.id !== behavior.id),
            logicGraphs: candidate.logicGraphs.filter((graph) => graph.id !== behavior.graphId),
          })),
          activeBehaviorId:
            state.activeBehaviorId === behavior.id ? remaining[0]?.id ?? null : state.activeBehaviorId,
        } as EditorState;
      });
    }

    case 'behavior/select': {
      const screen = getActiveScreen(state);
      return screen.behaviors.some((candidate) => candidate.id === action.behaviorId)
        ? { ...state, activeBehaviorId: action.behaviorId }
        : state;
    }

    case 'graph/action-add': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = appendAction(graph, action.payload);
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/condition-add': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = appendCondition(graph);
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/node-add': {
      const graph = findGraph(state, action.graphId);
      if (!graph) return state;
      const nextGraph = action.node.kind === 'condition'
        ? addConditionNode(graph, action.position)
        : addActionNode(graph, action.node.payload, action.position);
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/normalize': {
      const current = findGraph(state, action.graph.id);
      return !current || current === action.graph
        ? state
        : updateGraphWithoutHistory(state, current.id, action.graph);
    }

    case 'graph/condition-update': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = updateCondition(graph, action.nodeId, action.patch);
      if (nextGraph === graph) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/node-dragStart':
      return pushHistory(state, () => state);

    case 'graph/node-move': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = moveLogicNode(graph, action.nodeId, {
        x: Math.round(action.x),
        y: Math.round(action.y),
      });
      return nextGraph === graph ? state : updateGraphWithoutHistory(state, graph.id, nextGraph);
    }

    case 'graph/connect-ports': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = connectLogicPorts(
        graph,
        action.fromNodeId,
        action.fromPort,
        action.toNodeId,
      );
      if (!nextGraph) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/edge-delete': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = disconnectLogicEdge(graph, action.edgeId);
      if (nextGraph === graph) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/action-update': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = updateAction(graph, action.nodeId, action.payload);
      if (nextGraph === graph) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/action-delete': {
      const graph = findGraph(state, action.graphId);
      if (!graph || !graph.nodes.some((node) => node.id === action.nodeId)) {
        return state;
      }
      const nextGraph = removeLogicNodes(graph, new Set([action.nodeId]));
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/connect': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = addConnection(graph, action.fromNodeId, action.toNodeId);
      if (nextGraph === null) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    case 'graph/disconnect': {
      const graph = findGraph(state, action.graphId);
      if (!graph) {
        return state;
      }
      const nextGraph = removeConnection(graph, action.fromNodeId, action.toNodeId);
      if (nextGraph === graph) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceGraph(document, state.activeScreenId, graph.id, nextGraph),
      }) as EditorState);
    }

    // AI assistant -------------------------------------------------------------
    /** One proposal = one undoable history entry on the shared command stack. */
    case 'assistant/apply': {
      const nextDocument = applyAssistantProposal(state.document, state.activeScreenId, action.proposal);
      if (nextDocument === state.document) {
        return state;
      }
      return pushHistory(state, () => ({ ...state, document: nextDocument }) as EditorState);
    }

    // Device chrome -----------------------------------------------------------

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
    activeBehaviorId: behaviorStillExists(previous, state.activeScreenId, state.activeBehaviorId),
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
    activeBehaviorId: behaviorStillExists(next, state.activeScreenId, state.activeBehaviorId),
    hasUnsavedChanges: true,
  };
}

function behaviorStillExists(
  document: ProjectDocument,
  activeScreenId: string,
  activeBehaviorId: string | null,
): string | null {
  if (!activeBehaviorId) {
    return null;
  }
  const screen = document.screens.find((candidate) => candidate.id === activeScreenId);
  return screen?.behaviors.some((candidate) => candidate.id === activeBehaviorId) ? activeBehaviorId : null;
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

function addNode(
  state: EditorState,
  nodeType: ComponentType,
  rawX: number,
  rawY: number,
  parentId: string | null,
): EditorState {
  const activeScreen = getActiveScreen(state);
  const parentLocation = parentId
    ? getComponentTreeLocation(activeScreen.nodes, parentId)
    : null;
  const validParent =
    parentLocation?.node.type === 'container' && !parentLocation.node.isLocked
      ? parentLocation
      : null;
  const bounds = validParent
    ? { width: validParent.node.w, height: validParent.node.h }
    : deviceViewport(state.device);
  const { w, h } = getDefaultNodeSize(nodeType);
  const geometry = clampNodeToBounds(
    {
      x: snapOrRaw(rawX - (validParent?.absoluteX ?? 0) - w / 2, state.isSnapEnabled),
      y: snapOrRaw(rawY - (validParent?.absoluteY ?? 0) - h / 2, state.isSnapEnabled),
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
        nodes: insertNodeAtParent(screen.nodes, validParent?.node.id ?? null, node),
      })),
      selectedNodeId: node.id,
      dropIndicator: null,
    } as EditorState;
  });
}

function insertNodeAtParent(
  nodes: readonly ComponentNode[],
  parentId: string | null,
  node: ComponentNode,
): ComponentNode[] {
  if (parentId === null) {
    return [...nodes, node];
  }
  return nodes.map((candidate) => {
    if (candidate.id === parentId && candidate.type === 'container') {
      return { ...candidate, children: [...candidate.children, node] };
    }
    if (candidate.type === 'container') {
      return {
        ...candidate,
        children: insertNodeAtParent(candidate.children, parentId, node),
      };
    }
    return candidate;
  });
}

function reparentNodeForCanvas(
  nodes: readonly ComponentNode[],
  nodeId: string,
  parentId: string | null,
  absolutePosition: { x: number; y: number } | undefined,
  rootBounds: ScreenFrameSize,
): readonly ComponentNode[] {
  const moved = reparentLayerInTree(nodes, nodeId, parentId, absolutePosition);
  if (moved === nodes) {
    return nodes;
  }
  const location = getComponentTreeLocation(moved, nodeId);
  if (!location) {
    return nodes;
  }
  const bounds = location.parentWidth && location.parentHeight
    ? { width: location.parentWidth, height: location.parentHeight }
    : rootBounds;
  const geometry = clampNodeToBounds(location.node, bounds);
  return remapTree(moved, nodeId, { ...location.node, ...geometry });
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

function updateNodeWithHistory(
  state: EditorState,
  nodeId: string,
  transform: (node: ComponentNode) => ComponentNode,
): EditorState {
  const node = findNodeInScreen(getActiveScreen(state), nodeId);
  if (!node) {
    return state;
  }
  const replacement = transform(node);
  if (JSON.stringify(replacement) === JSON.stringify(node)) {
    return state;
  }
  return pushHistory(state, (document) => ({
    ...state,
    document: replaceScreen(document, state.activeScreenId, (screen) => ({
      ...screen,
      nodes: remapTree(screen.nodes, nodeId, replacement),
    })),
  }) as EditorState);
}

function duplicateNode(state: EditorState, nodeId: string): EditorState {
  const screen = getActiveScreen(state);
  const source = findNodeInScreen(screen, nodeId);
  if (!source) {
    return state;
  }

  const location = getComponentTreeLocation(screen.nodes, nodeId);
  return pushHistory(state, (document) => {
    const copy = cloneWithFreshIds(source);
    const bounds = location?.parentWidth && location.parentHeight
      ? { width: location.parentWidth, height: location.parentHeight }
      : deviceViewport(state.device);
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

  const removedIds = collectSubtreeIds(screen.nodes, nodeId);
  return pushHistory(state, (document) => {
    // Behaviors bound to the removed component (or its descendants) and the
    // graphs opened from them are dropped with the node.
    const nextScreen: Screen = {
      ...screen,
      nodes: pruneNode(screen.nodes, nodeId),
      behaviors: screen.behaviors.filter((behavior) => !removedIds.has(behavior.targetNodeId)),
      logicGraphs: screen.logicGraphs
        .filter((graph) => !removedIds.has(graph.sourceNodeId))
        .map((graph) => removeLogicNodes(graph, removedIds)),
    };
    return {
      ...state,
      document: {
        screens: document.screens.map((candidate) =>
          candidate.id === state.activeScreenId ? nextScreen : candidate,
        ),
      },
      selectedNodeId: null,
      activeBehaviorId: nextScreen.behaviors.some(
        (candidate) => candidate.id === state.activeBehaviorId,
      )
        ? state.activeBehaviorId
        : null,
    } as EditorState;
  });
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

function findGraph(state: EditorState, graphId: string): LogicGraph | undefined {
  return getActiveScreen(state).logicGraphs.find((candidate) => candidate.id === graphId);
}

function updateGraphWithoutHistory(
  state: EditorState,
  graphId: string,
  graph: LogicGraph,
): EditorState {
  return {
    ...state,
    document: replaceGraph(state.document, state.activeScreenId, graphId, graph),
    hasUnsavedChanges: true,
  };
}

function replaceGraph(
  document: ProjectDocument,
  screenId: string,
  graphId: string,
  nextGraph: LogicGraph,
): ProjectDocument {
  return replaceScreen(document, screenId, (candidate) => ({
    ...candidate,
    logicGraphs: candidate.logicGraphs.map((candidateGraph) =>
      candidateGraph.id === graphId ? nextGraph : candidateGraph,
    ),
  }));
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

/** The removed node plus everything inside it (containers carry children). */
function collectSubtreeIds(nodes: readonly ComponentNode[], nodeId: string): Set<string> {
  const ids = new Set<string>();
  const walk = (list: readonly ComponentNode[], removing: boolean): void => {
    for (const node of list) {
      const isRemoving = removing || node.id === nodeId;
      if (isRemoving) {
        ids.add(node.id);
      }
      if (node.type === 'container') {
        walk(node.children, isRemoving);
      }
    }
  };
  walk(nodes, false);
  return ids;
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
