import type {
  ButtonProps,
  ComponentNode,
  ComponentType,
  ImageProps,
  InputProps,
  ListProps,
  NodeGeometry,
  TextProps,
} from '@domain/entities/componentNode';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type { EditorDevice } from './geometry';

/*
 * Every editor action carries a plain payload (serializable, replayable in
 * devtools). Node props have one action per component type, which keeps the
 * reducer fully type-safe without `any` or function-valued actions.
 */

export type EditorScreenAction =
  | { type: 'screen/select'; screenId: string }
  | { type: 'screen/add' }
  | { type: 'screen/rename'; screenId: string; name: string }
  | { type: 'screen/delete'; screenId: string };

export type EditorNodeAction =
  | { type: 'node/select'; nodeId: string | null }
  | { type: 'node/add'; nodeType: ComponentType; x: number; y: number }
  /** Pushes history once when a drag session starts; move/resize skip history. */
  | { type: 'node/dragStart' }
  | { type: 'node/move'; nodeId: string; x: number; y: number }
  | { type: 'node/nudge'; nodeId: string; dx: number; dy: number }
  | { type: 'node/resize'; nodeId: string; geometry: NodeGeometry }
  | { type: 'node/props-button'; nodeId: string; props: Partial<ButtonProps> }
  | { type: 'node/props-text'; nodeId: string; props: Partial<TextProps> }
  | { type: 'node/props-input'; nodeId: string; props: Partial<InputProps> }
  | { type: 'node/props-image'; nodeId: string; props: Partial<ImageProps> }
  | { type: 'node/props-list'; nodeId: string; props: Partial<ListProps> }
  | { type: 'node/duplicate'; nodeId: string }
  | { type: 'node/delete'; nodeId: string }
  | { type: 'node/order'; nodeId: string; direction: 'forward' | 'backward' };

export type EditorCanvasAction =
  | { type: 'canvas/dropIndicator'; position: { x: number; y: number } | null }
  | { type: 'canvas/dropAt'; nodeType: ComponentType; x: number; y: number };

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
  | EditorChromeAction
  | EditorHistoryAction
  | EditorAutosaveAction;

export type EditorMode = 'design' | 'logic';

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
  readonly device: EditorDevice;
  readonly zoom: number;
  readonly isSnapEnabled: boolean;
  readonly dropIndicator: { x: number; y: number } | null;
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
  readonly lastSavedAt: Date | null;
}

export const ZOOM_LIMITS = { min: 0.5, max: 2, step: 0.25 } as const;

export function createEditorState(document: ProjectDocument): EditorState {
  return {
    document,
    past: [],
    future: [],
    activeScreenId: document.screens[0]?.id ?? '',
    selectedNodeId: null,
    device: 'mobile',
    zoom: 1,
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
