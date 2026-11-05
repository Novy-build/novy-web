import type { ComponentNode } from '@domain/entities/componentNode';

/** Rendering contexts for the shared project-document renderer. */
export type RendererMode = 'canvas' | 'preview' | 'thumbnail';

export interface ComponentRendererProps {
  node: ComponentNode;
  mode: RendererMode;
  selected: boolean;
  onSelect?: (nodeId: string) => void;
}
