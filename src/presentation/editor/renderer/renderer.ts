import type { ComponentNode, ResponsiveBreakpoint } from '@domain/entities/componentNode';
import type { TriggerEvent } from '@domain/entities/logic';
import type { DataCollection, DataRecord } from '@domain/entities/appData';

/** Rendering contexts for the shared project-document renderer. */
export type RendererMode = 'canvas' | 'preview' | 'thumbnail';

export interface RendererDataContext {
  collections: readonly DataCollection[];
  recordsByCollection: ReadonlyMap<string, readonly DataRecord[]>;
}

export interface ComponentRendererProps {
  node: ComponentNode;
  breakpoint?: ResponsiveBreakpoint;
  mode: RendererMode;
  selected: boolean;
  /** Carries nested selection through frame recursion. */
  selectedNodeId?: string | null;
  onSelect?: (nodeId: string) => void;
  /** Reactive preview: fires when a non-canvas node receives a click. */
  onNodeAction?: (nodeId: string) => void;
  /** Preview runtime event hook for click/change behavior execution. */
  onNodeEvent?: (nodeId: string, event: TriggerEvent, value?: string) => void;
  /** Preview-only input value updates consumed by condition nodes. */
  onNodeValueChange?: (nodeId: string, value: string) => void;
  dataContext?: RendererDataContext;
  onFormSubmit?: (nodeId: string, values: string[]) => void;
}
