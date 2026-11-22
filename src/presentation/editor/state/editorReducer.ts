import type { ComponentAppearance, ComponentNode, ComponentType } from '@domain/entities/componentNode';
import { geometryAtBreakpoint, isChildBearingNode, isHiddenAtBreakpoint, isMainAxisLayoutNode, resolveEdgeInsets, type NodeGeometry, type ResponsiveBreakpoint } from '@domain/entities/componentNode';
import { createComponentNode, getDefaultNodeSize } from '@domain/factories/componentNode';
import { generateId } from '@domain/ids';
import { screenPathFromName } from '@domain/factories/screen';
import type { LogicGraph } from '@domain/entities/logic';
import type { ProjectDocument, RecordRouteParameter, Screen } from '@domain/entities/screen';
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
import { fitMainAxisSizes } from '@domain/layout/autoFit';
import {
  findMainAxisInsertIndex,
  getComponentTreeLocation,
  moveLayerInTree,
  reparentLayerInTree,
} from '@domain/componentTree';
import type { ScreenFrameSize } from '@presentation/editor/renderer/ScreenFrame';
import { clampNodeToBounds, deviceViewport, MIN_NODE_SIZE, SNAP_GRID, snapOrRaw } from './geometry';
import { behaviorDisplayName } from '../logic/behaviorLabels';
import { createBlankWebsiteSection } from '@domain/sections/blankSection';
import { moveWebsiteSection } from '@domain/sections/sectionTree';
import { normalizeWebsiteScreen, websitePageHeight, WEBSITE_PAGE_WIDTHS } from '@domain/sections/sectionLayout';
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
  const next = reduceEditorState(state, action);
  if (next.projectType !== 'website' || next.document === state.document) return next;
  return {
    ...next,
    document: {
      ...next.document,
      screens: next.document.screens.map(normalizeWebsiteScreen),
    },
  };
}

function reduceEditorState(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'document/set':
      return createEditorState(action.document, state.projectType);

    case 'design/system':
      return pushHistory(state, (document) => ({
        ...state,
        document: { ...document, designSystem: structuredClone(action.designSystem) },
      }) as EditorState);

    case 'section/add': {
      if (state.projectType !== 'website' || state.designScope.kind !== 'screen') return state;
      const sectionCount = getActiveScreen(state).nodes.filter((node) => node.type === 'column').length;
      const created = createBlankWebsiteSection(`Section ${sectionCount + 1}`);
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (screen) => ({
          ...screen,
          nodes: [...screen.nodes, created],
        })),
        selectedNodeId: created.id,
      }) as EditorState);
    }

    case 'section/move':
      if (state.projectType !== 'website') return state;
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (screen) => ({
          ...screen,
          nodes: moveWebsiteSection(screen.nodes, action.nodeId, action.direction),
        })),
      }) as EditorState);

    // Screens -----------------------------------------------------------------
    case 'screen/select': {
      const exists = state.document.screens.some((screen) => screen.id === action.screenId);
      if (!exists) {
        return state;
      }
      return { ...state, activeScreenId: action.screenId, selectedNodeId: null, designScope: { kind: 'screen' } };
    }

    case 'screen/add':
      return pushHistory(state, (document) => {
        const name = `Screen ${document.screens.length + 1}`;
        const screen: Screen = {
          id: generateId('screen'),
          name,
          path: uniqueScreenPath(document, screenPathFromName(name)),
          nodes: [],
          behaviors: [],
          logicGraphs: [],
        };
        return {
          ...state,
          document: { ...document, screens: [...document.screens, screen] },
          activeScreenId: screen.id,
          selectedNodeId: null,
          designScope: { kind: 'screen' },
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

    case 'screen/path': {
      const path = normalizeScreenPath(action.path);
      if (!path || state.document.screens.some((screen) => screen.id !== action.screenId && screen.path === path)) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, action.screenId, (screen) => ({ ...screen, path })),
      }) as EditorState);
    }

    case 'routes/record-identifier-sync': {
      const targetScreenIds = new Set(
        [
          ...state.document.screens.flatMap((screen) =>
            screen.routeParameters?.some((parameter) => parameter.source.collectionId === action.collectionId)
              ? [screen.id]
              : []),
          ...state.document.screens.flatMap((sourceScreen) =>
            sourceScreen.logicGraphs.flatMap((graph) =>
              graph.nodes.flatMap((node) => node.kind === 'action'
                && node.payload.type === 'navigate'
                && node.payload.recordContext?.collectionId === action.collectionId
                && node.payload.targetScreenId !== sourceScreen.id
                ? [node.payload.targetScreenId]
                : []))),
        ],
      );
      if (targetScreenIds.size === 0) return state;
      const nextScreens = state.document.screens.map((screen) => targetScreenIds.has(screen.id)
        ? linkScreenRecordRoute(screen, action.collectionId, action.identifierKey)
        : screen);
      if (nextScreens.every((screen, index) => screen === state.document.screens[index])) {
        return state;
      }
      return pushHistory(state, (document) => ({
        ...state,
        document: { ...document, screens: nextScreens },
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
          document: { ...document, screens: remaining },
          activeScreenId,
          selectedNodeId: null,
          designScope: { kind: 'screen' },
          activeBehaviorId: activeScreen.behaviors.some(
            (candidate) => candidate.id === state.activeBehaviorId,
          )
            ? state.activeBehaviorId
            : null,
        } as EditorState;
      });
    }

    // Selection & nodes -------------------------------------------------------
    case 'node/select': {
      if (state.designScope.kind !== 'list-item-template') {
        return { ...state, selectedNodeId: action.nodeId };
      }
      const frameId = state.designScope.listViewId;
      // The item frame is the fallback selection inside item design: there is
      // never an empty selection, so the frame's Inspector and guide stay
      // reachable without a separate deselection state.
      if (action.nodeId === null) {
        return { ...state, selectedNodeId: frameId };
      }
      if (action.nodeId === frameId || nodeBelongsToDesignScope(state, action.nodeId)) {
        return { ...state, selectedNodeId: action.nodeId };
      }
      return state;
    }

    case 'node/add':
      return addNode(state, action.nodeType, action.x, action.y, null);

    case 'canvas/dropAt':
      return addNode(state, action.nodeType, action.x, action.y, action.parentId ?? null);

    case 'node/dragStart':
      return pushHistory(state, () => state);

    case 'node/move':
      if (isItemFrame(state, action.nodeId)) return state;
      return updateNode(state, action.nodeId, (node) => {
        const current = geometryAtBreakpoint(node, state.device);
        const bounds = resolveNodeGeometryBounds(
          getActiveScreen(state).nodes,
          action.nodeId,
          state.device,
          deviceViewport(state.device),
        );
        const next = clampNodeToGeometryBounds(
          { x: Math.round(action.x), y: Math.round(action.y), w: current.w, h: current.h },
          bounds,
        );
        return applyBreakpointGeometry(node, { ...current, x: next.x, y: next.y }, state.device);
      });

    case 'screen/appearance':
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, action.screenId, (screen) => ({
          ...screen,
          appearance: action.appearance && Object.keys(action.appearance).length > 0
            ? structuredClone(action.appearance)
            : undefined,
        })),
      }) as EditorState);

    case 'node/layout-position': {
      if (isItemFrame(state, action.nodeId)) return state;
      const layoutBounds = resolveNodeGeometryBounds(
        getActiveScreen(state).nodes,
        action.nodeId,
        state.device,
        deviceViewport(state.device),
      );
      return updateNodeWithHistory(state, action.nodeId, (node) => {
        const current = geometryAtBreakpoint(node, state.device);
        return applyBreakpointGeometry(node, clampNodeToGeometryBounds(
          { x: action.x, y: action.y, w: current.w, h: current.h },
          layoutBounds,
        ), state.device);
      });
    }

    case 'node/layout-size': {
      if (isItemFrame(state, action.nodeId)) return state;
      const resizeConstraint = resolveNodeResizeConstraint(
        getActiveScreen(state).nodes,
        action.nodeId,
        state.device,
        deviceViewport(state.device),
      );
      return updateNodeWithHistory(state, action.nodeId, (node) => {
        const current = geometryAtBreakpoint(node, state.device);
        return applyBreakpointGeometry(node, clampNodeToResizeConstraint(
          { x: current.x, y: current.y, w: action.w, h: action.h },
          resizeConstraint,
        ), state.device);
      });
    }

    case 'node/resize': {
      if (isItemFrame(state, action.nodeId)) return state;
      const resizeConstraint = resolveNodeResizeConstraint(
        getActiveScreen(state).nodes,
        action.nodeId,
        state.device,
        deviceViewport(state.device),
      );
      return updateNode(state, action.nodeId, (node) => applyBreakpointGeometry(node,
        clampNodeToResizeConstraint(
          {
            x: Math.round(action.geometry.x),
            y: Math.round(action.geometry.y),
            w: Math.round(action.geometry.w),
            h: Math.round(action.geometry.h),
          },
          resizeConstraint,
        ), state.device));
    }

    case 'node/nudge': {
      if (isItemFrame(state, action.nodeId)) return state;
      const activeScreen = getActiveScreen(state);
      const location = getComponentTreeLocation(activeScreen.nodes, action.nodeId, state.device);
      if (!location) {
        return state;
      }
      return pushHistory(state, (document) => {
        const bounds = resolveNodeGeometryBounds(
          activeScreen.nodes,
          action.nodeId,
          state.device,
          deviceViewport(state.device),
        );
        return {
          ...state,
          document: replaceScreen(document, state.activeScreenId, (candidate) => ({
            ...candidate,
            nodes: remapTree(candidate.nodes, action.nodeId, applyNudge(findNodeInScreen(candidate, action.nodeId)!, action.dx, action.dy, bounds, state.device)),
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

    case 'node/props-icon':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'icon' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-input':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'input' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-image':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'image' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-column':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'column' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-gesture-detector':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'gesture-detector' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-row':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'row' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-listview':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'listview'
          ? {
              ...node,
              props: { ...node.props, ...action.props },
              children: action.props.dataSource?.kind === 'collection' && action.props.dataSource.displayFieldIds[0]
                ? remapItemField(node.children, 'value', action.props.dataSource.displayFieldIds[0])
                : node.children,
            }
          : node,
      );

    case 'node/props-camera':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'camera' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-file-input':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'file-input' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/props-chat':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'chat' ? { ...node, props: { ...node.props, ...action.props } } : node,
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

    case 'node/props-chart':
      return updateNodeWithHistory(state, action.nodeId, (node) =>
        node.type === 'chart' ? { ...node, props: { ...node.props, ...action.props } } : node,
      );

    case 'node/duplicate':
      if (isItemFrame(state, action.nodeId)) return state;
      return duplicateNode(state, action.nodeId);

    case 'node/wrap-gesture-detector': {
      if (isItemFrame(state, action.nodeId)) return state;
      const screen = getActiveScreen(state);
      const target = findNodeInScreen(screen, action.nodeId);
      if (!target || target.type === 'gesture-detector') return state;
      const wrapperId = generateId('node');
      return pushHistory(state, (document) => ({
        ...state,
        document: replaceScreen(document, state.activeScreenId, (candidate) => ({
          ...candidate,
          nodes: wrapNodeInGestureDetector(candidate.nodes, action.nodeId, wrapperId),
        })),
        selectedNodeId: wrapperId,
      }) as EditorState);
    }

    case 'node/delete':
      if (isItemFrame(state, action.nodeId)) return state;
      return normalizeDesignScope(deleteNode(state, action.nodeId));

    case 'node/order': {
      if (isItemFrame(state, action.nodeId)) return state;
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
      if (isItemFrame(state, action.nodeId)) return state;
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        name: action.name.trim() || undefined,
      }));

    case 'node/layer-visibility':
      if (isItemFrame(state, action.nodeId)) return state;
      return updateNodeWithHistory(state, action.nodeId, (node) => {
        const effectiveHidden = isHiddenAtBreakpoint(node, state.device);
        return setBreakpointHidden(node, !effectiveHidden, state.device);
      });

    case 'node/layer-lock':
      if (isItemFrame(state, action.nodeId)) return state;
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        isLocked: node.isLocked ? undefined : true,
      }));

    case 'node/appearance': {
      // A base color edit drops the matching dark override; otherwise the saved
      // dark value keeps winning in dark mode while the Inspector shows the new
      // base color, making the edit look like it was ignored.
      const withoutDarkOverride = (value: ComponentAppearance | undefined): ComponentAppearance | undefined => {
        if (!action.clearDark || !value?.dark?.[action.clearDark]) return value;
        const dark = { ...value.dark };
        delete dark[action.clearDark];
        return { ...value, dark: Object.keys(dark).length > 0 ? dark : undefined };
      };
      return updateNodeWithHistory(state, action.nodeId, (node) => {
        if (state.device === 'mobile') {
          const base = withoutDarkOverride(action.appearance);
          return {
            ...node,
            appearance: base && Object.keys(base).length > 0 ? { ...base } : undefined,
          };
        }
        const responsive = { ...(node.responsive ?? {}) };
        if (action.clearDark) {
          for (const breakpoint of Object.keys(responsive) as Array<Exclude<ResponsiveBreakpoint, 'mobile'>>) {
            const entry = responsive[breakpoint];
            if (entry) responsive[breakpoint] = { ...entry, appearance: withoutDarkOverride(entry.appearance) };
          }
        }
        responsive[state.device] = {
          ...(responsive[state.device] ?? {}),
          appearance: withoutDarkOverride(action.appearance),
        };
        return {
          ...node,
          appearance: withoutDarkOverride(node.appearance),
          responsive,
        };
      });
    }

    case 'node/style':
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        styleId: action.styleId || undefined,
      }));

    case 'node/responsive-text-style':
      return updateNodeWithHistory(state, action.nodeId, (node) => {
        if (node.type !== 'text') return node;
        if (state.device === 'mobile') {
          return { ...node, props: { ...node.props, ...action.textStyle } };
        }
        const responsive = { ...(node.responsive ?? {}) };
        responsive[state.device] = {
          ...(responsive[state.device] ?? {}),
          textStyle: { ...(responsive[state.device]?.textStyle ?? {}), ...action.textStyle },
        };
        return { ...node, responsive };
      });

    case 'node/bindings':
      return updateNodeWithHistory(state, action.nodeId, (node) => ({
        ...node,
        bindings: action.bindings.length > 0 ? structuredClone(action.bindings) : undefined,
      }));

    case 'node/responsive-reset':
      return updateNodeWithHistory(state, action.nodeId, (node) => {
        if (state.device === 'mobile') {
          return { ...node, responsive: undefined };
        }
        const responsive = { ...(node.responsive ?? {}) };
        delete responsive[state.device];
        return { ...node, responsive: Object.keys(responsive).length ? responsive : undefined };
      });

    case 'node/reparent': {
      if (isItemFrame(state, action.nodeId)) return state;
      const activeScreen = getActiveScreen(state);
      const parentId = resolveDesignParentId(state, action.parentId);
      if (
        !nodeBelongsToDesignScope(state, action.nodeId)
        || !canUseDesignParent(state, parentId)
      ) {
        return state;
      }
      const moved = reparentNodeForCanvas(
        activeScreen.nodes,
        action.nodeId,
        parentId,
        action.absolutePosition,
        deviceViewport(state.device),
        state.device,
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
              parentId,
              action.absolutePosition,
              deviceViewport(state.device),
              state.device,
            ),
          ],
        })),
        selectedNodeId: action.nodeId,
        hasUnsavedChanges: true,
      };
    }

    case 'node/layer-move': {
      if (isItemFrame(state, action.nodeId)) return state;
      if (isItemFrame(state, action.targetId)) return state;
      const activeScreen = getActiveScreen(state);
      const targetLocation = getComponentTreeLocation(activeScreen.nodes, action.targetId, state.device);
      if (!targetLocation) {
        return state;
      }
      const destinationParentId = action.position === 'inside'
        ? action.targetId
        : targetLocation.parentId;
      if (
        !nodeBelongsToDesignScope(state, action.nodeId)
        || !canUseDesignParent(state, destinationParentId)
      ) {
        return state;
      }
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
        document: replaceScreen(document, state.activeScreenId, (screen) => {
          let nodes = [...moveLayerInTree(screen.nodes, action.nodeId, action.targetId, action.position)];
          if (action.position === 'inside') {
            const desiredNodes = nodes;
            for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
              nodes = fitPlacedNodeInTree(
                nodes,
                action.nodeId,
                destinationParentId,
                breakpoint,
                deviceViewport(breakpoint),
                desiredNodes,
              );
            }
          }
          return { ...screen, nodes };
        }),
        selectedNodeId: action.nodeId,
      }) as EditorState);
    }

    // Canvas chrome -----------------------------------------------------------
    case 'canvas/dropIndicator':
      return { ...state, dropIndicator: action.position };

    // Logic workspace ------------------------------------------------------------
    case 'behavior/create': {
      if (isItemFrame(state, action.targetNodeId)) return state;
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
        : addActionNode(graph, action.node.payload, action.position, action.node.inputMappings, action.connectToTail);
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
        action.toPort ?? 'in',
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
      const link = action.recordRouteLink;
      const linkTarget = link
        ? state.document.screens.find((screen) => screen.id === link.screenId) ?? null
        : null;
      const linkedTarget = link && linkTarget
        ? linkScreenRecordRoute(linkTarget, link.collectionId, link.identifierKey)
        : linkTarget;
      const routeChanged = Boolean(linkTarget && linkedTarget && linkedTarget !== linkTarget);
      if (nextGraph === graph && !routeChanged) {
        return state;
      }
      return pushHistory(state, (document) => {
        const withGraph = replaceGraph(document, state.activeScreenId, graph.id, nextGraph);
        const nextDocument = link && routeChanged
          ? replaceScreen(withGraph, link.screenId, (screen) =>
              linkScreenRecordRoute(screen, link.collectionId, link.identifierKey))
          : withGraph;
        return { ...state, document: nextDocument } as EditorState;
      });
    }

    case 'graph/action-inputs-update': {
      const graph = findGraph(state, action.graphId);
      if (!graph) return state;
      const target = graph.nodes.find((node) => node.id === action.nodeId);
      if (!target || target.kind !== 'action') return state;
      const inputMappings = Object.keys(action.inputMappings).length > 0
        ? structuredClone(action.inputMappings)
        : undefined;
      const nextGraph = {
        ...graph,
        nodes: graph.nodes.map((node) => node.id === target.id ? { ...target, inputMappings } : node),
      };
      if (JSON.stringify(nextGraph) === JSON.stringify(graph)) return state;
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
      return { ...state, device: action.device };

    case 'zoom/set':
      return {
        ...state,
        zoom: Math.min(Math.max(action.zoom, ZOOM_LIMITS.min), ZOOM_LIMITS.max),
      };

    case 'snap/toggle':
      return { ...state, isSnapEnabled: !state.isSnapEnabled };

    case 'design/item-template-open': {
      const screen = getActiveScreen(state);
      const listView = findNodeInScreen(screen, action.listViewId);
      if (listView?.type !== 'listview') return state;
      return {
        ...state,
        designScope: {
          kind: 'list-item-template',
          listViewId: action.listViewId,
          sampleItemId: action.sampleItemId ?? null,
        },
        selectedNodeId: listView.id,
      };
    }

    case 'design/item-template-close':
      return {
        ...state,
        selectedNodeId: state.designScope.kind === 'list-item-template' ? state.designScope.listViewId : state.selectedNodeId,
        designScope: { kind: 'screen' },
      };

    case 'design/item-template-sample':
      return state.designScope.kind === 'list-item-template'
        ? { ...state, designScope: { ...state.designScope, sampleItemId: action.sampleItemId } }
        : state;

    // Autosave ----------------------------------------------------------------
    case 'autosave/begin':
      return { ...state, isSaving: true, autosaveError: null };

    case 'autosave/end':
      return {
        ...state,
        isSaving: false,
        hasUnsavedChanges: action.savedDocument !== state.document,
        lastSavedAt: action.savedAt,
        autosaveError: null,
      };

    case 'autosave/fail':
      return { ...state, isSaving: false, hasUnsavedChanges: true, autosaveError: action.message };

    // History -----------------------------------------------------------------
    case 'history/undo':
      return normalizeDesignScope(undo(state));

    case 'history/redo':
      return normalizeDesignScope(redo(state));

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

/** Resolves the ListView item-template boundary that owns a nested node. */
function findOwningListViewId(
  nodes: readonly ComponentNode[],
  nodeId: string,
  ownerId: string | null = null,
): string | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return ownerId;
    }
    if (!isChildBearingNode(node)) {
      continue;
    }
    const nestedOwner = node.type === 'listview' ? node.id : ownerId;
    if (findNodeInNodes(node.children, nodeId)) {
      return findOwningListViewId(node.children, nodeId, nestedOwner);
    }
  }
  return null;
}

function findNodeInNodes(
  nodes: readonly ComponentNode[],
  nodeId: string,
): ComponentNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (isChildBearingNode(node)) {
      const nested = findNodeInNodes(node.children, nodeId);
      if (nested) return nested;
    }
  }
  return undefined;
}

function resolveDesignParentId(state: EditorState, parentId: string | null): string | null {
  return state.designScope.kind === 'list-item-template' && parentId === null
    ? state.designScope.listViewId
    : parentId;
}

/**
 * Screen editing may only use screen-level frames. Item-template editing may
 * only use the active ListView itself or frames already inside its boundary.
 */
function canUseDesignParent(state: EditorState, parentId: string | null): boolean {
  const screen = getActiveScreen(state);
  if (parentId === null) {
    return state.designScope.kind === 'screen';
  }
  const parent = findNodeInScreen(screen, parentId);
  if (!parent || !isChildBearingNode(parent)) {
    return false;
  }
  const boundaryId = parent.type === 'listview'
    ? parent.id
    : findOwningListViewId(screen.nodes, parent.id);
  return state.designScope.kind === 'screen'
    ? boundaryId === null
    : boundaryId === state.designScope.listViewId;
}

function nodeBelongsToDesignScope(state: EditorState, nodeId: string): boolean {
  const screen = getActiveScreen(state);
  if (!findNodeInScreen(screen, nodeId)) {
    return false;
  }
  const boundaryId = findOwningListViewId(screen.nodes, nodeId);
  return state.designScope.kind === 'screen'
    ? boundaryId === null
    : boundaryId === state.designScope.listViewId;
}

function isItemFrame(state: EditorState, nodeId: string | null): nodeId is string {
  return (
    state.designScope.kind === 'list-item-template' &&
    nodeId !== null &&
    nodeId === state.designScope.listViewId
  );
}

interface NodeGeometryBounds extends ScreenFrameSize {
  x: number;
  y: number;
}

interface NodeResizeConstraint {
  bounds: NodeGeometryBounds;
  maxWidth: number;
  maxHeight: number;
}

/**
 * Direct ListView children live inside the repeated item's padded content box.
 * Every geometry mutation uses this resolver so the isolated item editor and
 * the repeated renderer agree from the first palette drop onward.
 */
function childGeometryBounds(
  parent: ComponentNode | null,
  breakpoint: ResponsiveBreakpoint,
  rootBounds: ScreenFrameSize,
): NodeGeometryBounds {
  if (!parent) {
    return { x: 0, y: 0, ...rootBounds };
  }
  const parentGeometry = geometryAtBreakpoint(parent, breakpoint);
  if (parent.type !== 'listview') {
    return { x: 0, y: 0, width: parentGeometry.w, height: parentGeometry.h };
  }
  const padding = resolveEdgeInsets(parent.props.padding);
  const isVertical = parent.props.scrollDirection === 'vertical';
  const widthExtent = isVertical ? parentGeometry.w : rootBounds.width;
  const heightExtent = isVertical ? rootBounds.height : parentGeometry.h;
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(1, widthExtent - padding.left - padding.right),
    height: Math.max(1, heightExtent - padding.top - padding.bottom),
  };
}

function resolveNodeGeometryBounds(
  nodes: readonly ComponentNode[],
  nodeId: string,
  breakpoint: ResponsiveBreakpoint,
  rootBounds: ScreenFrameSize,
): NodeGeometryBounds {
  const location = getComponentTreeLocation(nodes, nodeId, breakpoint);
  const parent = location?.parentId
    ? getComponentTreeLocation(nodes, location.parentId, breakpoint)?.node ?? null
    : null;
  return childGeometryBounds(parent, breakpoint, rootBounds);
}

/**
 * Resolves the actual space a child may occupy while being resized. Free-form
 * parents expose their complete content box. Row and Column reserve their
 * padding, gaps, and the main-axis sizes of visible siblings so the resized
 * child cannot push the linear layout beyond the parent's trailing edge.
 */
function resolveNodeResizeConstraint(
  nodes: readonly ComponentNode[],
  nodeId: string,
  breakpoint: ResponsiveBreakpoint,
  rootBounds: ScreenFrameSize,
): NodeResizeConstraint {
  const location = getComponentTreeLocation(nodes, nodeId, breakpoint);
  const parent = location?.parentId
    ? getComponentTreeLocation(nodes, location.parentId, breakpoint)?.node ?? null
    : null;
  const bounds = childGeometryBounds(parent, breakpoint, rootBounds);

  if (!parent || !isMainAxisLayoutNode(parent)) {
    return { bounds, maxWidth: bounds.width, maxHeight: bounds.height };
  }

  const parentGeometry = geometryAtBreakpoint(parent, breakpoint);
  const padding = resolveEdgeInsets(parent.props.padding);
  const contentWidth = Math.max(1, parentGeometry.w - padding.left - padding.right);
  const contentHeight = Math.max(1, parentGeometry.h - padding.top - padding.bottom);
  const visibleChildren = parent.children.filter(
    (child) => !isHiddenAtBreakpoint(child, breakpoint),
  );
  const siblingGeometries = visibleChildren
    .filter((child) => child.id !== nodeId)
    .map((child) => geometryAtBreakpoint(child, breakpoint));
  const gaps = Math.max(0, visibleChildren.length - 1) * Math.max(0, parent.props.gap);
  const isRow = parent.type === 'row';
  const occupiedMain = siblingGeometries.reduce(
    (total, geometry) => total + (isRow ? geometry.w : geometry.h),
    0,
  );
  const remainingMain = Math.max(
    isRow ? MIN_NODE_SIZE.w : MIN_NODE_SIZE.h,
    (isRow ? contentWidth : contentHeight) - gaps - occupiedMain,
  );

  return {
    bounds: {
      x: padding.left,
      y: padding.top,
      width: contentWidth,
      height: contentHeight,
    },
    maxWidth: isRow ? Math.min(contentWidth, remainingMain) : contentWidth,
    maxHeight: isRow ? contentHeight : Math.min(contentHeight, remainingMain),
  };
}

function clampNodeToGeometryBounds(
  geometry: NodeGeometry,
  bounds: NodeGeometryBounds,
): NodeGeometry {
  const clamped = clampNodeToBounds(
    {
      ...geometry,
      x: geometry.x - bounds.x,
      y: geometry.y - bounds.y,
    },
    bounds,
  );
  return {
    ...clamped,
    x: clamped.x + bounds.x,
    y: clamped.y + bounds.y,
  };
}

function clampNodeToResizeConstraint(
  geometry: NodeGeometry,
  constraint: NodeResizeConstraint,
): NodeGeometry {
  return clampNodeToGeometryBounds(
    {
      ...geometry,
      w: Math.min(geometry.w, constraint.maxWidth),
      h: Math.min(geometry.h, constraint.maxHeight),
    },
    constraint.bounds,
  );
}

/**
 * Applies fit-once sizing after a node enters a parent. Free-form parents only
 * constrain the placed node. Row and Column also rebalance all visible
 * siblings along their main axis so their stored dimensions plus gaps fit the
 * parent's padded content box. Hidden siblings keep their persisted geometry.
 */
function fitPlacedNodeInTree(
  nodes: readonly ComponentNode[],
  nodeId: string,
  parentId: string | null,
  breakpoint: ResponsiveBreakpoint,
  rootBounds: ScreenFrameSize,
  desiredNodes: readonly ComponentNode[] = nodes,
): ComponentNode[] {
  const parent = parentId
    ? getComponentTreeLocation(nodes, parentId, breakpoint)?.node ?? null
    : null;
  const desiredParent = parentId
    ? getComponentTreeLocation(desiredNodes, parentId, breakpoint)?.node ?? null
    : null;

  if (
    parent
    && desiredParent
    && isMainAxisLayoutNode(parent)
    && isMainAxisLayoutNode(desiredParent)
  ) {
    const parentGeometry = geometryAtBreakpoint(desiredParent, breakpoint);
    const padding = resolveEdgeInsets(desiredParent.props.padding);
    const isRow = desiredParent.type === 'row';
    const mainAvailable = Math.max(
      1,
      isRow
        ? parentGeometry.w - padding.left - padding.right
        : parentGeometry.h - padding.top - padding.bottom,
    );
    const crossAvailable = Math.max(
      1,
      isRow
        ? parentGeometry.h - padding.top - padding.bottom
        : parentGeometry.w - padding.left - padding.right,
    );
    const visibleChildren = desiredParent.children.filter(
      (child) => !isHiddenAtBreakpoint(child, breakpoint),
    );
    const mainSizes = fitMainAxisSizes(
      visibleChildren.map((child) => {
        const geometry = geometryAtBreakpoint(child, breakpoint);
        return { id: child.id, size: isRow ? geometry.w : geometry.h };
      }),
      mainAvailable,
      desiredParent.props.gap,
      isRow ? MIN_NODE_SIZE.w : MIN_NODE_SIZE.h,
    );
    const children = parent.children.map((child) => {
      if (isHiddenAtBreakpoint(child, breakpoint)) {
        return child;
      }
      const desiredChild = desiredParent.children.find((candidate) => candidate.id === child.id) ?? child;
      const current = geometryAtBreakpoint(desiredChild, breakpoint);
      const next: NodeGeometry = isRow
        ? {
            ...current,
            w: mainSizes.get(child.id) ?? current.w,
            h: Math.max(MIN_NODE_SIZE.h, Math.min(current.h, crossAvailable)),
          }
        : {
            ...current,
            w: Math.max(MIN_NODE_SIZE.w, Math.min(current.w, crossAvailable)),
            h: mainSizes.get(child.id) ?? current.h,
          };
      return applyBreakpointGeometry(child, next, breakpoint);
    });
    return remapTree(nodes, parent.id, { ...parent, children });
  }

  const location = getComponentTreeLocation(nodes, nodeId, breakpoint);
  const desiredLocation = getComponentTreeLocation(desiredNodes, nodeId, breakpoint);
  if (!location || !desiredLocation) {
    return [...nodes];
  }
  const bounds = childGeometryBounds(desiredParent, breakpoint, rootBounds);
  const current = geometryAtBreakpoint(desiredLocation.node, breakpoint);
  const fitted = clampNodeToGeometryBounds(current, bounds);
  return remapTree(
    nodes,
    nodeId,
    applyBreakpointGeometry(location.node, fitted, breakpoint),
  );
}

function addNode(
  state: EditorState,
  nodeType: ComponentType,
  rawX: number,
  rawY: number,
  parentId: string | null,
): EditorState {
  const activeScreen = getActiveScreen(state);
  const resolvedParentId = resolveDesignParentId(state, parentId);
  if (state.projectType === 'website' && resolvedParentId === null && nodeType !== 'column') {
    return state;
  }
  if (!canUseDesignParent(state, resolvedParentId)) {
    return state;
  }
  const parentLocation = resolvedParentId
    ? getComponentTreeLocation(activeScreen.nodes, resolvedParentId, state.device)
    : null;
  const validParent =
    parentLocation && isChildBearingNode(parentLocation.node) && !parentLocation.node.isLocked
      ? parentLocation
      : resolvedParentId === null
        ? null
        : undefined;
  if (validParent === undefined) {
    return state;
  }
  const rootBounds = state.projectType === 'website'
    ? {
        width: WEBSITE_PAGE_WIDTHS[state.device],
        height: websitePageHeight(activeScreen, state.device) + deviceViewport(state.device).height,
      }
    : deviceViewport(state.device);
  const bounds = childGeometryBounds(
    validParent?.node ?? null,
    state.device,
    rootBounds,
  );
  const defaults = getDefaultNodeSize(nodeType);
  const listParent = validParent?.node.type === 'listview' ? validParent.node : null;
  const isDirectListLayout = listParent !== null && (nodeType === 'row' || nodeType === 'column');
  // Direct item-template roots default to half of the padded cross-axis so they
  // can travel the full content width instead of being pinned near the centre.
  // Floor (do not round) the snapped value: rounding half of an even grid
  // width can land one grid step above half, which re-collides with the centre.
  const w = isDirectListLayout && listParent?.props.scrollDirection === 'vertical'
    ? Math.min(
        defaults.w,
        state.isSnapEnabled
          ? Math.max(MIN_NODE_SIZE.w, Math.floor((bounds.width / 2) / SNAP_GRID) * SNAP_GRID)
          : Math.max(MIN_NODE_SIZE.w, Math.round(bounds.width / 2)),
      )
    : defaults.w;
  const h = isDirectListLayout && listParent?.props.scrollDirection === 'horizontal'
    ? Math.min(
        defaults.h,
        state.isSnapEnabled
          ? Math.max(MIN_NODE_SIZE.h, Math.floor((bounds.height / 2) / SNAP_GRID) * SNAP_GRID)
          : Math.max(MIN_NODE_SIZE.h, Math.round(bounds.height / 2)),
      )
    : defaults.h;
  const geometry = clampNodeToGeometryBounds(
    {
      x: snapOrRaw(rawX - (validParent?.absoluteX ?? 0) - w / 2, state.isSnapEnabled),
      y: snapOrRaw(rawY - (validParent?.absoluteY ?? 0) - h / 2, state.isSnapEnabled),
      w,
      h,
    },
    bounds,
  );

  const insertIndex = validParent && isMainAxisLayoutNode(validParent.node)
    ? findMainAxisInsertIndex(
        validParent.node,
        rawX - validParent.absoluteX,
        rawY - validParent.absoluteY,
        state.device,
      )
    : undefined;
  return pushHistory(state, (document) => {
    const created = createComponentNode(nodeType);
    const mobileBounds = childGeometryBounds(
      validParent?.node ?? null,
      'mobile',
      deviceViewport('mobile'),
    );
    const mobileGeometry = state.device === 'mobile'
      ? geometry
      : clampNodeToGeometryBounds(geometry, mobileBounds);
    let node: ComponentNode = { ...created, ...mobileGeometry };
    if (state.device !== 'mobile') {
      node = applyBreakpointGeometry(node, geometry, state.device);
    }
    let nodes = insertNodeAtParent(activeScreen.nodes, validParent?.node.id ?? null, node, insertIndex);
    const desiredNodes = nodes;
    for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
      nodes = fitPlacedNodeInTree(
        nodes,
        node.id,
        validParent?.node.id ?? null,
        breakpoint,
        deviceViewport(breakpoint),
        desiredNodes,
      );
    }
    return {
      ...state,
      document: replaceScreen(document, state.activeScreenId, (screen) => ({
        ...screen,
        nodes,
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
  insertIndex?: number,
): ComponentNode[] {
  if (parentId === null) {
    const index = Math.max(0, Math.min(insertIndex ?? nodes.length, nodes.length));
    return [...nodes.slice(0, index), node, ...nodes.slice(index)];
  }
  return nodes.map((candidate) => {
    if (candidate.id === parentId && isChildBearingNode(candidate)) {
      const index = Math.max(0, Math.min(insertIndex ?? candidate.children.length, candidate.children.length));
      const children = [...candidate.children];
      children.splice(index, 0, node);
      return { ...candidate, children };
    }
    if (isChildBearingNode(candidate)) {
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
  breakpoint: ResponsiveBreakpoint = 'mobile',
): readonly ComponentNode[] {
  const sourceLocation = getComponentTreeLocation(nodes, nodeId, 'mobile');
  const sourceNode = sourceLocation?.node;
  if (!sourceNode) return nodes;

  const breakpoints: readonly ResponsiveBreakpoint[] = ['mobile', 'tablet', 'desktop'];
  const desiredAbs = new Map<ResponsiveBreakpoint, { x: number; y: number }>();
  for (const bp of breakpoints) {
    const location = getComponentTreeLocation(nodes, nodeId, bp);
    const fallback = location
      ? { x: location.absoluteX, y: location.absoluteY }
      : { x: 0, y: 0 };
    desiredAbs.set(bp, bp === breakpoint && absolutePosition ? absolutePosition : fallback);
  }

  const moved = reparentLayerInTree(nodes, nodeId, parentId, breakpoint === 'mobile' ? absolutePosition : undefined);
  if (moved === nodes) {
    return nodes;
  }
  const movedNode = getComponentTreeLocation(moved, nodeId, 'mobile')?.node;
  if (!movedNode) return nodes;

  const parentAbs = new Map<ResponsiveBreakpoint, { x: number; y: number }>();
  for (const bp of breakpoints) {
    const location = getComponentTreeLocation(moved, nodeId, bp);
    parentAbs.set(bp, {
      x: location?.parentAbsoluteX ?? 0,
      y: location?.parentAbsoluteY ?? 0,
    });
  }

  const mobileBase = {
    x: movedNode.x,
    y: movedNode.y,
    w: movedNode.w,
    h: movedNode.h,
  };
  const responsive: { tablet?: { x?: number; y?: number; w?: number; h?: number; isHidden?: boolean }; desktop?: { x?: number; y?: number; w?: number; h?: number; isHidden?: boolean } } = {};

  const tabletSourceSize = geometryAtBreakpoint(sourceNode, 'tablet');
  const tabletRel = {
    x: (desiredAbs.get('tablet')!.x - parentAbs.get('tablet')!.x),
    y: (desiredAbs.get('tablet')!.y - parentAbs.get('tablet')!.y),
    w: tabletSourceSize.w,
    h: tabletSourceSize.h,
  };
  const tabletOverride: { x?: number; y?: number; w?: number; h?: number } = {};
  for (const field of ['x', 'y', 'w', 'h'] as const) {
    if (tabletRel[field] !== mobileBase[field]) tabletOverride[field] = Math.round(tabletRel[field]);
  }
  if (Object.keys(tabletOverride).length > 0) responsive.tablet = tabletOverride;

  const desktopSourceSize = geometryAtBreakpoint(sourceNode, 'desktop');
  const desktopRel = {
    x: (desiredAbs.get('desktop')!.x - parentAbs.get('desktop')!.x),
    y: (desiredAbs.get('desktop')!.y - parentAbs.get('desktop')!.y),
    w: desktopSourceSize.w,
    h: desktopSourceSize.h,
  };
  const desktopInherited = responsive.tablet
    ? geometryAtBreakpoint({ ...movedNode, responsive: { tablet: responsive.tablet } }, 'tablet')
    : mobileBase;
  const desktopOverride: { x?: number; y?: number; w?: number; h?: number } = {};
  for (const field of ['x', 'y', 'w', 'h'] as const) {
    if (desktopRel[field] !== desktopInherited[field]) desktopOverride[field] = Math.round(desktopRel[field]);
  }
  if (Object.keys(desktopOverride).length > 0) responsive.desktop = desktopOverride;

  let newNode: ComponentNode = {
    ...movedNode,
    x: Math.round(mobileBase.x),
    y: Math.round(mobileBase.y),
    w: mobileBase.w,
    h: mobileBase.h,
    responsive: Object.keys(responsive).length ? responsive : undefined,
  };

  const bounds = resolveNodeGeometryBounds(moved, nodeId, breakpoint, rootBounds);
  const current = geometryAtBreakpoint(newNode, breakpoint);
  const clamped = clampNodeToGeometryBounds(current, bounds);
  newNode = applyBreakpointGeometry(newNode, clamped, breakpoint);

  let fitted = remapTree(moved, nodeId, newNode);
  const desiredNodes = fitted;
  for (const bp of breakpoints) {
    fitted = fitPlacedNodeInTree(fitted, nodeId, parentId, bp, deviceViewport(bp), desiredNodes);
  }
  return fitted;
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

  return pushHistory(state, (document) => {
    const copy = cloneWithFreshIds(source);
    const bounds = resolveNodeGeometryBounds(
      screen.nodes,
      nodeId,
      'mobile',
      deviceViewport('mobile'),
    );
    // +16 with no re-snap: duplicates stay axis-aligned with their source
    // even when the source itself sits between grid lines.
    const geometry = clampNodeToGeometryBounds(
      { x: source.x + 16, y: source.y + 16, w: copy.w, h: copy.h },
      bounds,
    );
    let placed: ComponentNode = { ...copy, ...geometry };
    if (copy.responsive) {
      const responsive = structuredClone(copy.responsive);
      for (const breakpoint of ['tablet', 'desktop'] as const) {
        const override = responsive[breakpoint];
        if (!override) continue;
        if (override.x !== undefined) override.x += 16;
        if (override.y !== undefined) override.y += 16;
      }
      placed = { ...placed, responsive };
      placed = compactResponsiveNode(placed);
    }

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
  bounds: NodeGeometryBounds,
  breakpoint: ResponsiveBreakpoint,
): ComponentNode {
  const current = geometryAtBreakpoint(node, breakpoint);
  const next = clampNodeToGeometryBounds(
    { x: Math.round(current.x + dx), y: Math.round(current.y + dy), w: current.w, h: current.h },
    bounds,
  );
  return applyBreakpointGeometry(node, next, breakpoint);
}

function wrapNodeInGestureDetector(
  nodes: readonly ComponentNode[],
  nodeId: string,
  wrapperId: string,
): ComponentNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      const child: ComponentNode = {
        ...node,
        x: 0,
        y: 0,
        responsive: node.responsive
          ? Object.fromEntries(Object.entries(node.responsive).map(([breakpoint, override]) => [
              breakpoint,
              { ...override, x: 0, y: 0 },
            ]))
          : undefined,
      } as ComponentNode;
      return {
        id: wrapperId,
        type: 'gesture-detector',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        responsive: node.responsive ? structuredClone(node.responsive) : undefined,
        props: { semanticLabel: `Open ${node.name?.trim() || 'item'}` },
        children: [child],
      };
    }
    if (!isChildBearingNode(node)) return node;
    const children = wrapNodeInGestureDetector(node.children, nodeId, wrapperId);
    return children.some((child, index) => child !== node.children[index])
      ? { ...node, children }
      : node;
  });
}

function normalizeDesignScope(state: EditorState): EditorState {
  if (state.designScope.kind === 'screen') return state;
  const screen = state.document.screens.find((candidate) => candidate.id === state.activeScreenId);
  const owner = screen ? findNodeInScreen(screen, state.designScope.listViewId) : undefined;
  return owner?.type === 'listview'
    ? state
    : { ...state, designScope: { kind: 'screen' } };
}

function remapItemField(
  nodes: readonly ComponentNode[],
  fromFieldId: string,
  toFieldId: string,
): ComponentNode[] {
  return nodes.map((node) => ({
    ...node,
    ...(node.bindings
      ? {
          bindings: node.bindings.map((binding) => binding.value.fieldId === fromFieldId
            ? { ...binding, value: { ...binding.value, fieldId: toFieldId } }
            : binding),
        }
      : {}),
    ...(isChildBearingNode(node)
      ? { children: remapItemField(node.children, fromFieldId, toFieldId) }
      : {}),
  })) as ComponentNode[];
}

function inheritedHiddenAtBreakpoint(node: ComponentNode, breakpoint: ResponsiveBreakpoint): boolean {
  if (breakpoint === 'tablet') {
    return node.isHidden === true;
  }
  const withoutDesktop: ComponentNode = {
    ...node,
    responsive: node.responsive ? { ...node.responsive, desktop: undefined } : undefined,
  };
  return isHiddenAtBreakpoint(withoutDesktop, 'tablet');
}

function setBreakpointHidden(
  node: ComponentNode,
  hidden: boolean,
  breakpoint: ResponsiveBreakpoint,
): ComponentNode {
  if (breakpoint === 'mobile') {
    return { ...node, isHidden: hidden ? true : undefined };
  }
  const inheritedHidden = inheritedHiddenAtBreakpoint(node, breakpoint);
  const responsive = { ...(node.responsive ?? {}) };
  const current: { x?: number; y?: number; w?: number; h?: number; isHidden?: boolean } = {
    ...(responsive[breakpoint] ?? {}),
  };
  if (hidden === inheritedHidden) {
    delete current.isHidden;
  } else {
    current.isHidden = hidden;
  }
  if (Object.keys(current).length > 0) {
    responsive[breakpoint] = current;
  } else {
    delete responsive[breakpoint];
  }
  return { ...node, responsive: Object.keys(responsive).length ? responsive : undefined };
}

function compactResponsiveNode(node: ComponentNode): ComponentNode {
  if (!node.responsive) return node;
  const responsive = structuredClone(node.responsive);
  const tablet = responsive.tablet;
  if (tablet) {
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      if (tablet[field] !== undefined && tablet[field] === (node as unknown as Record<string, number>)[field]) {
        delete tablet[field];
      }
    }
    if (Object.keys(tablet).length === 0) delete responsive.tablet;
  }
  const desktop = responsive.desktop;
  if (desktop) {
    const tabletResolved = responsive.tablet
      ? geometryAtBreakpoint({ ...node, responsive: { tablet: responsive.tablet } }, 'tablet')
      : { x: node.x, y: node.y, w: node.w, h: node.h };
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      if (desktop[field] !== undefined && desktop[field] === tabletResolved[field]) {
        delete desktop[field];
      }
    }
    if (Object.keys(desktop).length === 0) delete responsive.desktop;
  }
  return { ...node, responsive: Object.keys(responsive).length ? responsive : undefined };
}

function inheritedGeometry(node: ComponentNode, breakpoint: ResponsiveBreakpoint): NodeGeometry {
  if (breakpoint === 'tablet') {
    return { x: node.x, y: node.y, w: node.w, h: node.h };
  }
  const withoutDesktop: ComponentNode = {
    ...node,
    responsive: node.responsive ? { ...node.responsive, desktop: undefined } : undefined,
  };
  return geometryAtBreakpoint(withoutDesktop, 'tablet');
}

function applyBreakpointGeometry(
  node: ComponentNode,
  geometry: NodeGeometry,
  breakpoint: ResponsiveBreakpoint,
): ComponentNode {
  if (breakpoint === 'mobile') {
    return { ...node, ...geometry };
  }
  const inherited = inheritedGeometry(node, breakpoint);
  const responsive = { ...(node.responsive ?? {}) };
  const current: { x?: number; y?: number; w?: number; h?: number; isHidden?: boolean } = {
    ...(responsive[breakpoint] ?? {}),
  };
  for (const field of ['x', 'y', 'w', 'h'] as const) {
    if (geometry[field] !== inherited[field]) {
      current[field] = geometry[field];
    } else {
      delete current[field];
    }
  }
  // Preserve an existing breakpoint visibility override while geometry compacts.
  const previous = node.responsive?.[breakpoint];
  if (previous?.isHidden !== undefined && current.isHidden === undefined) {
    current.isHidden = previous.isHidden;
  }
  if (Object.keys(current).length > 0) {
    responsive[breakpoint] = current;
  } else {
    delete responsive[breakpoint];
  }
  return {
    ...node,
    responsive: Object.keys(responsive).length ? responsive : undefined,
  };
}


function normalizeScreenPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withSlash === '/') return '/';
  const segments = withSlash.split('/').filter(Boolean).map((segment) => {
    if (segment.startsWith(':')) {
      const name = segment.slice(1).replace(/[^A-Za-z0-9]+/g, '');
      return name ? `:${name}` : '';
    }
    return segment.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  }).filter(Boolean);
  return `/${segments.join('/')}`;
}

/**
 * Links one collection identity to a screen route without clobbering other
 * collections or unrelated dynamic segments. Returns the same screen when the
 * route is already correct so callers can keep history free of no-op entries.
 */
function linkScreenRecordRoute(screen: Screen, collectionId: string, identifierKey: string): Screen {
  // The home route must stay static. Record-aware navigation to "/" is a
  // configuration error that validation reports instead of rewriting the path.
  if (screen.path === '/') return screen;

  const routeParameters = screen.routeParameters ?? [];
  const existing = routeParameters.find((parameter) =>
    parameter.source.kind === 'record-id' && parameter.source.collectionId === collectionId);
  const dynamicSegments = [...screen.path.matchAll(/:([A-Za-z][A-Za-z0-9]*)/g)]
    .map((match) => match[1]!);
  const claimedNames = new Set(routeParameters.map((parameter) => parameter.name));
  let path = screen.path;

  if (existing) {
    if (dynamicSegments.includes(existing.name)) {
      path = screen.path.replace(`:${existing.name}`, `:${identifierKey}`);
    } else {
      const adoptable = dynamicSegments.filter((name) => !claimedNames.has(name));
      path = adoptable.length === 1
        ? screen.path.replace(`:${adoptable[0]}`, `:${identifierKey}`)
        : appendRouteSegment(screen.path, identifierKey);
    }
  } else {
    const adoptable = dynamicSegments.filter((name) =>
      !claimedNames.has(name) && isRecordIdentifierSegment(name));
    if (adoptable.length === 1) {
      path = screen.path.replace(`:${adoptable[0]}`, `:${identifierKey}`);
    } else if (dynamicSegments.includes(identifierKey)) {
      // Another collection already owns this parameter name. Leave the screen
      // untouched so validation can report the missing mapping.
      return screen;
    } else {
      path = appendRouteSegment(screen.path, identifierKey);
    }
  }

  const nextParameters: RecordRouteParameter[] = [
    ...routeParameters.filter((parameter) =>
      !(parameter.source.kind === 'record-id' && parameter.source.collectionId === collectionId)),
    {
      name: identifierKey,
      source: { kind: 'record-id', collectionId, identifierKey },
    },
  ];
  if (path === screen.path && sameRouteParameters(routeParameters, nextParameters)) {
    return screen;
  }
  return { ...screen, path, routeParameters: nextParameters };
}

function appendRouteSegment(path: string, name: string): string {
  const base = path === '/' ? '' : path.replace(/\/$/, '');
  return `${base}/:${name}`;
}

/** Placeholder names that can safely adopt a new record identifier. */
function isRecordIdentifierSegment(name: string): boolean {
  return name === 'id' || name === 'recordId' || /Id$/.test(name);
}

function sameRouteParameters(
  left: readonly RecordRouteParameter[],
  right: readonly RecordRouteParameter[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function uniqueScreenPath(document: ProjectDocument, candidate: string): string {
  if (!document.screens.some((screen) => screen.path === candidate)) return candidate;
  let index = 2;
  while (document.screens.some((screen) => screen.path === `${candidate === '/' ? '/screen' : candidate}-${index}`)) index += 1;
  return `${candidate === '/' ? '/screen' : candidate}-${index}`;
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
    if (isChildBearingNode(node)) {
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
    isChildBearingNode(node)
      ? { ...node, children: insertSiblingInTree(node.children, sourceNodeId, copy) }
      : node,
  );
}

function pruneNode(nodes: readonly ComponentNode[], nodeId: string): ComponentNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) =>
      isChildBearingNode(node) ? { ...node, children: pruneNode(node.children, nodeId) } : node,
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
      if (isChildBearingNode(node)) {
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
  direction: 'forward' | 'backward' | 'front' | 'back',
): readonly ComponentNode[] {
  const sourceIndex = nodes.findIndex((node) => node.id === nodeId);
  if (sourceIndex !== -1) {
    if (direction === 'forward' || direction === 'backward') {
      const targetIndex = direction === 'forward' ? sourceIndex + 1 : sourceIndex - 1;
      if (targetIndex < 0 || targetIndex >= nodes.length) {
        return nodes;
      }
      const copy = [...nodes];
      const moving = copy[sourceIndex]!;
      copy[sourceIndex] = copy[targetIndex]!;
      copy[targetIndex] = moving;
      return copy;
    }

    const targetIndex = direction === 'front' ? nodes.length - 1 : 0;
    if (sourceIndex === targetIndex) {
      return nodes;
    }
    const copy = [...nodes];
    const [moving] = copy.splice(sourceIndex, 1);
    copy.splice(targetIndex, 0, moving!);
    return copy;
  }

  let changed = false;
  const mapped = nodes.map((node) => {
    if (isChildBearingNode(node)) {
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
    if (isChildBearingNode(next)) {
      return { ...next, children: next.children.map((child) => reassign(child)) };
    }
    return next;
  };
  return reassign(clone);
}
