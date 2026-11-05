import type { ComponentNode } from '@domain/entities/componentNode';

/** Rendering contexts for the shared project-document renderer. */
export type RendererMode = 'canvas' | 'preview' | 'thumbnail';

export interface ComponentRendererProps {
  node: ComponentNode;
  mode: RendererMode;
  selected: boolean;
  /** Carries nested selection through frame recursion. */
  selectedNodeId?: string | null;
  onSelect?: (nodeId: string) => void;
  /** Reactive preview: fires when a non-canvas node receives a click. */
  onNodeAction?: (nodeId: string) => void;
  /** Preview-only input value updates consumed by condition nodes. */
  onNodeValueChange?: (nodeId: string, value: string) => void;
}
