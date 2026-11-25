import type { ChartDataSource, ComponentNode, NodeGeometry, ResponsiveBreakpoint } from '@domain/entities/componentNode';
import type { TriggerEvent } from '@domain/entities/logic';
import type { DataCollection, DataRecord, ListItemContext, LocalListItemAddition } from '@domain/entities/appData';
import type { AppDesignSystem } from '@domain/entities/designSystem';

/** Rendering contexts for the shared project-document renderer. */
export type RendererMode = 'canvas' | 'preview' | 'thumbnail';

export interface RendererDataContext {
  collections: readonly DataCollection[];
  recordsByCollection: ReadonlyMap<string, readonly DataRecord[]>;
  /** Chart data produced by Load Chart Data Logic nodes, keyed by chart component ID. */
  chartDataByNode?: ReadonlyMap<string, ChartDataSource>;
  /** Preview/generated-runtime items keyed by ListView or Chat component ID. */
  localItemsByListView?: ReadonlyMap<string, readonly LocalListItemAddition[]>;
  /** Chat components currently waiting for an asynchronous workflow response. */
  pendingChatNodeIds?: ReadonlySet<string>;
}

export interface RendererEventContext {
  listItem?: ListItemContext;
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
  onNodeEvent?: (nodeId: string, event: TriggerEvent, value?: string, context?: RendererEventContext) => void;
  /** Preview-only input value updates consumed by condition nodes. */
  onNodeValueChange?: (nodeId: string, value: string) => void;
  /** Preview-only transient media; never persisted into the project document. */
  onNodeMediaChange?: (nodeId: string, media: File | null) => void;
  componentValues?: ReadonlyMap<string, string>;
  dataContext?: RendererDataContext;
  designSystem?: AppDesignSystem;
  /** Internal recursive override produced by a Column, Row, or ListView parent. */
  geometryOverride?: NodeGeometry;
  /** Current repeated ListView record for item-field bindings. */
  itemContext?: ListItemContext;
  /** Component IDs with an explicit click behavior on the active screen. */
  interactiveNodeIds?: ReadonlySet<string>;
  /** Phase 5 bottom-anchor intent, set only on the designated primary action. */
  bottomAnchored?: boolean;
}
