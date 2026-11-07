import type {
  ButtonProps,
  CheckboxProps,
  ComponentNode,
  ComponentType,
  ComponentAppearance,
  CameraProps,
  RepeaterProps,
  DividerProps,
  DropdownProps,
  FormProps,
  ImageProps,
  InputProps,
  ListProps,
  NodeGeometry,
  ProgressProps,
  RadioProps,
  SliderProps,
  SwitchProps,
  TextProps,
} from '@domain/entities/componentNode';
import type {
  ActionPayload,
  Behavior,
  ConditionNode,
  LogicGraph,
  LogicNodePosition,
  LogicOutputPort,
  TriggerEvent,
} from '@domain/entities/logic';
import type { AssistantProposal } from '@domain/ai/assistant';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type { EditorDevice } from './geometry';
import { DEFAULT_EDITOR_DEVICE, ZOOM_LIMITS } from './geometry';
export { ZOOM_LIMITS };/*
 * Every editor action carries a plain payload (serializable, replayable in
 * devtools). Node props have one action per component type, which keeps the
 * reducer fully type-safe without `any` or function-valued actions.
 */

export type EditorScreenAction =
  | { type: 'screen/select'; screenId: string }
  | { type: 'screen/add' }
  | { type: 'screen/rename'; screenId: string; name: string }
  | { type: 'screen/path'; screenId: string; path: string }
  | { type: 'screen/delete'; screenId: string };

export type EditorNodeAction =
  | { type: 'node/select'; nodeId: string | null }
  | { type: 'node/add'; nodeType: ComponentType; x: number; y: number }
  /** Pushes history once when a drag session starts; move/resize skip history. */
  | { type: 'node/dragStart' }
  | { type: 'node/move'; nodeId: string; x: number; y: number }
  | { type: 'node/layout-position'; nodeId: string; x: number; y: number }
  | { type: 'node/layout-size'; nodeId: string; w: number; h: number }
  | { type: 'node/nudge'; nodeId: string; dx: number; dy: number }
  | { type: 'node/resize'; nodeId: string; geometry: NodeGeometry }
  | { type: 'node/props-button'; nodeId: string; props: Partial<ButtonProps> }
  | { type: 'node/props-text'; nodeId: string; props: Partial<TextProps> }
  | { type: 'node/props-input'; nodeId: string; props: Partial<InputProps> }
  | { type: 'node/props-image'; nodeId: string; props: Partial<ImageProps> }
  | { type: 'node/props-list'; nodeId: string; props: Partial<ListProps> }
  | { type: 'node/props-repeater'; nodeId: string; props: Partial<RepeaterProps> }
  | { type: 'node/props-camera'; nodeId: string; props: Partial<CameraProps> }
  | { type: 'node/props-form'; nodeId: string; props: Partial<FormProps> }
  | { type: 'node/props-checkbox'; nodeId: string; props: Partial<CheckboxProps> }
  | { type: 'node/props-radio'; nodeId: string; props: Partial<RadioProps> }
  | { type: 'node/props-switch'; nodeId: string; props: Partial<SwitchProps> }
  | { type: 'node/props-dropdown'; nodeId: string; props: Partial<DropdownProps> }
  | { type: 'node/props-slider'; nodeId: string; props: Partial<SliderProps> }
  | { type: 'node/props-progress'; nodeId: string; props: Partial<ProgressProps> }
  | { type: 'node/props-divider'; nodeId: string; props: Partial<DividerProps> }
  | { type: 'node/duplicate'; nodeId: string }
  | { type: 'node/delete'; nodeId: string }
  | { type: 'node/order'; nodeId: string; direction: 'forward' | 'backward' }
  | { type: 'node/layer-rename'; nodeId: string; name: string }
  | { type: 'node/layer-visibility'; nodeId: string }
  | { type: 'node/layer-lock'; nodeId: string }
  | { type: 'node/appearance'; nodeId: string; appearance: ComponentAppearance }
  | { type: 'node/responsive-reset'; nodeId: string }
  | {
      type: 'node/reparent';
      nodeId: string;
      parentId: string | null;
      absolutePosition?: { x: number; y: number };
    }
  | {
      type: 'node/layer-move';
      nodeId: string;
      targetId: string;
      position: 'before' | 'inside';
    };

export type EditorCanvasAction =
  | { type: 'canvas/dropIndicator'; position: { x: number; y: number } | null }
  | {
      type: 'canvas/dropAt';
      nodeType: ComponentType;
      x: number;
      y: number;
      parentId?: string | null;
    };

export type EditorLogicAction =
  | { type: 'behavior/create'; targetNodeId: string; event: TriggerEvent }
  | { type: 'workflow/create'; event: TriggerEvent; position: LogicNodePosition }
  | { type: 'workflow/repair-graph'; behaviorId: string }
  | {
      type: 'workflow/trigger-update';
      behaviorId: string;
      targetNodeId: string;
      event: TriggerEvent;
    }
  | { type: 'behavior/delete'; behaviorId: string }
  | { type: 'behavior/select'; behaviorId: string }
  | { type: 'graph/action-add'; graphId: string; payload?: ActionPayload }
  | { type: 'graph/action-update'; graphId: string; nodeId: string; payload: ActionPayload }
  | { type: 'graph/action-inputs-update'; graphId: string; nodeId: string; inputMappings: import('@domain/entities/logic').ActionInputMappings }
  | { type: 'graph/action-delete'; graphId: string; nodeId: string }
  | { type: 'graph/condition-add'; graphId: string }
  | {
      type: 'graph/node-add';
      graphId: string;
      node:
        | { kind: 'condition' }
        | { kind: 'action'; payload: ActionPayload };
      position: LogicNodePosition;
    }
  | { type: 'graph/normalize'; graph: LogicGraph }
  | {
      type: 'graph/condition-update';
      graphId: string;
      nodeId: string;
      patch: Partial<Pick<ConditionNode, 'left' | 'operator' | 'compareValue'>>;
    }
  | { type: 'graph/node-dragStart' }
  | { type: 'graph/node-move'; graphId: string; nodeId: string; x: number; y: number }
  | {
      type: 'graph/connect-ports';
      graphId: string;
      fromNodeId: string;
      fromPort: LogicOutputPort;
      toNodeId: string;
    }
  | { type: 'graph/edge-delete'; graphId: string; edgeId: string }
  | { type: 'graph/connect'; graphId: string; fromNodeId: string; toNodeId: string }
  | { type: 'graph/disconnect'; graphId: string; fromNodeId: string; toNodeId: string };

/**
 * AI assistant: applying a proposal is one document transform and one
 * history entry, so Keep/Undo share the manual command stack.
 */
export type EditorAssistantAction = {
  type: 'assistant/apply';
  proposal: AssistantProposal;
};

export type EditorChromeAction =
  | { type: 'device/set'; device: EditorDevice }
  | { type: 'zoom/set'; zoom: number }
  | { type: 'snap/toggle' };

export type EditorHistoryAction = { type: 'history/undo' } | { type: 'history/redo' };

export type EditorAutosaveAction =
  | { type: 'autosave/begin' }
  | { type: 'autosave/end'; savedAt: Date };

export type EditorLoadedAction = { type: 'document/set'; document: ProjectDocument };

export type EditorAction =
  | EditorLoadedAction
  | EditorScreenAction
  | EditorNodeAction
  | EditorCanvasAction
  | EditorLogicAction
  | EditorAssistantAction
  | EditorChromeAction
  | EditorHistoryAction
  | EditorAutosaveAction;

export type EditorMode = 'design' | 'logic' | 'data';

/**
 * The editor workspace state: one reducer for the document (with undo/redo
 * history), the active screen, selection, canvas chrome, and autosave status.
 * Pure — every behavior here is table-driven and unit-testable.
 */
export interface EditorState {
  readonly document: ProjectDocument;
  readonly past: readonly ProjectDocument[];
  readonly future: readonly ProjectDocument[];
  readonly activeScreenId: string;
  readonly selectedNodeId: string | null;
  /** Open behavior tab in the Logic workspace; falls back to the first behavior. */
  readonly activeBehaviorId: string | null;
  readonly device: EditorDevice;
  readonly zoom: number;
  readonly isSnapEnabled: boolean;
  readonly dropIndicator: { x: number; y: number } | null;
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
  readonly lastSavedAt: Date | null;
}

// ZOOM_LIMITS is re-exported from ./geometry to keep a single source of truth.
export function createEditorState(document: ProjectDocument): EditorState {
  return {
    document,
    past: [],
    future: [],
    activeScreenId: document.screens[0]?.id ?? '',
    selectedNodeId: null,
    activeBehaviorId: null,
    device: DEFAULT_EDITOR_DEVICE,    zoom: 1,
    isSnapEnabled: true,
    dropIndicator: null,
    hasUnsavedChanges: false,
    isSaving: false,
    lastSavedAt: null,
  };
}

export function getActiveScreen(state: EditorState): Screen {
  const screen = state.document.screens.find((candidate) => candidate.id === state.activeScreenId);
  return screen ?? state.document.screens[0];
}

export interface ActiveLogic {
  behavior: Behavior;
  graph: LogicGraph;
}

/** Active behavior tab and its graph on the active screen (first tab as fallback). */
export function getActiveLogic(state: EditorState): ActiveLogic | undefined {
  const screen = getActiveScreen(state);
  const behavior =
    screen.behaviors.find((candidate) => candidate.id === state.activeBehaviorId) ?? screen.behaviors[0];
  if (!behavior) {
    return undefined;
  }
  const graph = screen.logicGraphs.find((candidate) => candidate.id === behavior.graphId);
  return graph ? { behavior, graph } : undefined;
}

/** Finds a node anywhere in the active screen tree (top-level or container child). */
export function findNodeInScreen(screen: Screen, nodeId: string): ComponentNode | undefined {
  const stack: readonly ComponentNode[] = screen.nodes;
  for (const entry of stack) {
    if (entry.id === nodeId) {
      return entry;
    }
    if (entry.type === 'container') {
      const child = findNodeInScreen({ ...screen, nodes: entry.children }, nodeId);
      if (child) {
        return child;
      }
    }
  }
  return undefined;
}

/** Flat list of every node including container children, in paint order. */
export function flattenScreenNodes(nodes: readonly ComponentNode[]): ComponentNode[] {
  const flat: ComponentNode[] = [];
  for (const node of nodes) {
    flat.push(node);
    if (node.type === 'container') {
      flat.push(...flattenScreenNodes(node.children));
    }
  }
  return flat;
}
