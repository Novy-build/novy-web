import { useEffect, useMemo, useState, type Dispatch } from 'react';
import type {
  ActionPayload,
  ConditionNode,
  LogicGraph,
  LogicInputPort,
  LogicOutputPort,
  TriggerEvent,
} from '@domain/entities/logic';
import { recordIdentifierForCollection, type DataCollection } from '@domain/entities/appData';
import type { ComponentNode, ListViewNode } from '@domain/entities/componentNode';
import { isChildBearingNode } from '@domain/entities/componentNode';
import { normalizeLogicGraph } from '@domain/logic/graph';
import {
  findNodeInScreen,
  flattenScreenNodes,
  getActiveLogic,
  getActiveScreen,
  type EditorAction,
  type EditorState,
} from '../state/editorState';
import { BehaviorGraphTabs } from './BehaviorGraphTabs';
import { LogicGraphCanvas } from './LogicGraphCanvas';
import { LogicNodeConfig } from './LogicNodeConfig';
import { LogicNodeLibrary } from './LogicNodeLibrary';
import type { LogicLibraryNode } from './logicNodeRegistry';
import type { LogicNodeDefinition } from './logicNodeRegistry';
import { CURRENT_ITEM_ID_FIELD } from '@domain/entities/logic';
import { nodeDisplayLabel } from '../workspace/nodeLabels';
import { CollapsedPanelRail, PanelCollapseButton } from '../PanelCollapseControl';
import { ResizeHandle } from '../layout/ResizeHandle';
import { useResizablePane } from '../layout/useResizablePane';
import { useRagConfiguration } from './useRagConfiguration';

interface LogicWorkspaceProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  collections?: readonly DataCollection[];
  /** Project id used to load backend-owned RAG profiles and file sources. */
  projectId?: string;
}

const EMPTY_GRAPH: LogicGraph = {
  id: 'empty_logic_canvas',
  name: 'Empty workflow',
  sourceNodeId: '',
  nodes: [],
  edges: [],
};

/** n8n-inspired workspace: Nodes library, workflow canvas, and focused Details inspector. */
export function LogicWorkspace({
  state,
  dispatch,
  collections = [],
  projectId,
}: LogicWorkspaceProps) {
  const screen = getActiveScreen(state);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState('');
  const [isNodesCollapsed, setIsNodesCollapsed] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const rag = useRagConfiguration(projectId);
  const { size: nodesWidth, isDragging: isNodesDragging, startResize: startNodesResize, onKeyDown: nodesKeyDown, reset: resetNodesWidth } = useResizablePane({
    defaultSize: 256,
    minSize: 200,
    maxSize: 480,
    orientation: 'horizontal',
    storageKey: 'novy.editor.layout.v1.logic-nodes',
    grow: 1,
  });
  const { size: detailsWidth, isDragging: isDetailsDragging, startResize: startDetailsResize, onKeyDown: detailsKeyDown, reset: resetDetailsWidth } = useResizablePane({
    defaultSize: 288,
    minSize: 240,
    maxSize: 520,
    orientation: 'horizontal',
    storageKey: 'novy.editor.layout.v1.logic-details',
    grow: -1,
  });

  const active = getActiveLogic(state);
  const behavior = active?.behavior ??
    screen.behaviors.find((candidate) => candidate.id === state.activeBehaviorId) ??
    screen.behaviors[0] ??
    null;
  const rawGraph = behavior
    ? screen.logicGraphs.find((candidate) => candidate.id === behavior.graphId) ?? null
    : null;
  const graph = useMemo(
    () => rawGraph && behavior ? normalizeLogicGraph(rawGraph, behavior.event) : null,
    [behavior, rawGraph],
  );
  const selectedNode = graph?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const flatNodes = flattenScreenNodes(screen.nodes);
  const itemSource = behavior ? findNearestListView(screen.nodes, behavior.targetNodeId) : null;
  const itemDataSource = itemSource?.props.dataSource;
  const listLoader = itemSource
    ? screen.logicGraphs
        .flatMap((candidate) => candidate.nodes)
        .find((node) => node.kind === 'action'
          && node.payload.type === 'load-list-items'
          && node.payload.targetNodeId === itemSource.id)
    : undefined;
  const listLoaderPayload = listLoader?.kind === 'action' && listLoader.payload.type === 'load-list-items'
    ? listLoader.payload
    : null;
  const itemCollection = collections.find((collection) => collection.id === listLoaderPayload?.collectionId) ?? null;
  const listItemFields = listLoaderPayload && listLoaderPayload.fields.length > 0
    ? listLoaderPayload.fields
    : itemCollection?.fields
      ?? (itemDataSource?.kind === 'static' ? itemDataSource.fields : []);
  const contextualDefinitions: LogicNodeDefinition[] = [
    ...flatNodes
      .map((component): LogicNodeDefinition | null => {
        const event = defaultEventForComponent(component);
        if (!event) return null;
        const label = nodeDisplayLabel(component);
        return {
          id: `component-${component.id}-${event}`,
          category: 'Components',
          label: `${label} · ${componentTypeLabel(component)}`,
          description: `When ${label} is ${event === 'click' ? 'clicked' : 'changed'}`,
          icon: event === 'click' ? '↗' : '↻',
          keywords: [label, component.type, event],
          create: () => ({ kind: 'trigger', event, targetNodeId: component.id }),
        };
      })
      .filter((definition): definition is LogicNodeDefinition => definition !== null),
    ...(itemCollection ? currentItemDefinitions(itemCollection.id, itemCollection.name) : []),
  ];
  const tabs = screen.behaviors.map((candidate) => ({ id: candidate.id, label: candidate.name }));

  useEffect(() => {
    if (behavior && !rawGraph) {
      dispatch({ type: 'workflow/repair-graph', behaviorId: behavior.id });
      return;
    }
    if (rawGraph && graph && graph !== rawGraph) {
      dispatch({ type: 'graph/normalize', graph });
    }
  }, [behavior, dispatch, graph, rawGraph]);

  function nextPosition(): { x: number; y: number } {
    if (!graph || graph.nodes.length === 0) return { x: 80, y: 160 };
    return {
      x: Math.max(...graph.nodes.map((node) => node.position.x)) + 240,
      y: 160,
    };
  }

  function addLibraryNode(node: LogicLibraryNode, requestedPosition?: { x: number; y: number }): void {
    const position = requestedPosition ?? nextPosition();
    setLibraryMessage('');
    if (node.kind === 'trigger') {
      if (node.targetNodeId) {
        const existing = screen.behaviors.find((candidate) =>
          candidate.targetNodeId === node.targetNodeId && candidate.event === node.event);
        dispatch(existing
          ? { type: 'behavior/select', behaviorId: existing.id }
          : { type: 'behavior/create', targetNodeId: node.targetNodeId, event: node.event });
      } else {
        dispatch({ type: 'workflow/create', event: node.event, position });
      }
      return;
    }
    if (!graph) {
      setLibraryMessage('Add an On Click, On Change, or On Load trigger first.');
      return;
    }
    dispatch({
      type: 'graph/node-add',
      graphId: graph.id,
      node: node.kind === 'condition'
        ? { kind: 'condition' }
        : { kind: 'action', payload: node.payload, inputMappings: node.inputMappings },
      position,
      connectToTail: requestedPosition === undefined,
    });
  }

  function removeSelectedStep(nodeId: string | null = selectedNodeId): void {
    if (!behavior || !graph || !nodeId) {
      return;
    }
    const node = graph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.kind === 'trigger') {
      return;
    }
    dispatch({ type: 'graph/action-delete', graphId: graph.id, nodeId });
    setSelectedNodeId(null);
  }

  function removeWorkflow(): void {
    if (behavior) {
      dispatch({ type: 'behavior/delete', behaviorId: behavior.id });
      setSelectedNodeId(null);
    }
  }

  function configureSelected(nodeId: string, payload: ActionPayload): void {
    if (!graph) return;
    const recordCollection = payload.type === 'navigate' && payload.recordContext
      ? collections.find((collection) => collection.id === payload.recordContext!.collectionId)
        ?? itemCollection
      : null;
    const recordRouteLink = payload.type === 'navigate'
      && payload.recordContext
      && payload.targetScreenId
      // A list screen cannot also be its own record detail route.
      && payload.targetScreenId !== screen.id
      && recordCollection
      ? {
          screenId: payload.targetScreenId,
          collectionId: payload.recordContext.collectionId,
          identifierKey: recordIdentifierForCollection(recordCollection).key,
        }
      : undefined;
    dispatch({
      type: 'graph/action-update',
      graphId: graph.id,
      nodeId,
      payload,
      ...(recordRouteLink ? { recordRouteLink } : {}),
    });
  }

  function configureInputMappings(nodeId: string, inputMappings: import('@domain/entities/logic').ActionInputMappings): void {
    if (graph) dispatch({ type: 'graph/action-inputs-update', graphId: graph.id, nodeId, inputMappings });
  }

  function configureCondition(
    nodeId: string,
    patch: Partial<Pick<ConditionNode, 'left' | 'operator' | 'compareValue'>>,
  ): void {
    if (graph) dispatch({ type: 'graph/condition-update', graphId: graph.id, nodeId, patch });
  }

  function connectNodes(fromNodeId: string, fromPort: LogicOutputPort, toNodeId: string, toPort: LogicInputPort = 'in'): void {
    if (graph) {
      dispatch({ type: 'graph/connect-ports', graphId: graph.id, fromNodeId, fromPort, toNodeId, toPort });
    }
  }

  function configureTrigger(targetNodeId: string, event: TriggerEvent): void {
    if (behavior) {
      dispatch({ type: 'workflow/trigger-update', behaviorId: behavior.id, targetNodeId, event });
    }
  }

  const renderedGraph = graph ?? EMPTY_GRAPH;

  return (
    <section aria-label="Logic workspace" className="flex min-h-0 flex-1 flex-col bg-canvas">
      <BehaviorGraphTabs
        activeBehaviorId={behavior?.id ?? null}
        onSelect={(behaviorId) => {
          setSelectedNodeId(null);
          dispatch({ type: 'behavior/select', behaviorId });
        }}
        tabs={tabs}
      />

      <div className="flex min-h-0 flex-1">
        {isNodesCollapsed ? (
          <CollapsedPanelRail
            controls="logic-nodes-panel"
            label="nodes panel"
            onExpand={() => setIsNodesCollapsed(false)}
            side="left"
          />
        ) : (
          <>
            <div className="min-h-0 shrink-0 self-stretch" id="logic-nodes-panel" style={{ width: nodesWidth }}>
              <LogicNodeLibrary
                contextualDefinitions={contextualDefinitions}
                onAdd={addLibraryNode}
                onCollapse={() => setIsNodesCollapsed(true)}
              />
            </div>
            <ResizeHandle
              controls="logic-nodes-panel"
              isDragging={isNodesDragging}
              label="Resize nodes panel"
              max={480}
              min={200}
              onDoubleClick={resetNodesWidth}
              onKeyDown={nodesKeyDown}
              onPointerDown={startNodesResize}
              orientation="horizontal"
              value={nodesWidth}
            />
          </>
        )}
        <div className="relative flex min-w-0 flex-1">
          <LogicGraphCanvas
            fieldLabelFor={(collectionId, fieldId) =>
              collections.find((collection) => collection.id === collectionId)
                ?.fields.find((field) => field.id === fieldId)?.label ?? null
            }
            graph={renderedGraph}
            onConnect={connectNodes}
            onDeleteEdge={(edgeId) => graph && dispatch({ type: 'graph/edge-delete', graphId: graph.id, edgeId })}
            onDeleteNode={removeSelectedStep}
            onDropLibraryNode={addLibraryNode}
            onMoveNode={(nodeId, x, y) =>
              graph && dispatch({ type: 'graph/node-move', graphId: graph.id, nodeId, x, y })
            }
            onNodeDragStart={() => graph && dispatch({ type: 'graph/node-dragStart' })}
            onSelectNode={setSelectedNodeId}
            screenNameFor={(screenId) =>
              state.document.screens.find((candidate) => candidate.id === screenId)?.name ?? null
            }
            selectedNodeId={selectedNodeId}
            targetLabelFor={(nodeId) => {
              const target = findNodeInScreen(screen, nodeId);
              return target ? nodeDisplayLabel(target) : null;
            }}
          />
          {!graph ? (
            <p className="pointer-events-none absolute inset-x-0 top-20 text-center text-sm text-ink-muted">
              Add a trigger node from Nodes to start a workflow.
            </p>
          ) : null}
          {libraryMessage ? (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-2 text-xs text-surface" role="status">
              {libraryMessage}
            </p>
          ) : null}
        </div>

        {isDetailsCollapsed ? (
          <CollapsedPanelRail
            controls="logic-details-panel"
            label="details panel"
            onExpand={() => setIsDetailsCollapsed(false)}
            side="right"
          />
        ) : (
          <>
            <ResizeHandle
              controls="logic-details-panel"
              isDragging={isDetailsDragging}
              label="Resize details panel"
              max={520}
              min={240}
              onDoubleClick={resetDetailsWidth}
              onKeyDown={detailsKeyDown}
              onPointerDown={startDetailsResize}
              orientation="horizontal"
              value={detailsWidth}
            />
            <aside className="relative shrink-0 overflow-y-auto border-l border-hairline bg-surface p-4" id="logic-details-panel" style={{ width: detailsWidth }}>
              <PanelCollapseButton
                className="absolute right-0 top-0 z-30 bg-surface"
                controls="logic-details-panel"
                isCollapsed={false}
                label="details panel"
                onToggle={() => setIsDetailsCollapsed(true)}
                side="right"
              />
              <LogicNodeConfig
                behavior={behavior}
                collections={collections}
                currentScreenId={screen.id}
                fileSources={rag.fileSources}
                node={selectedNode}
                logicNodes={graph?.nodes ?? []}
                listItemFields={listItemFields}
                currentItemCollection={itemCollection}
                onConfigure={configureSelected}
                onConfigureInputMappings={configureInputMappings}
                onConfigureCondition={configureCondition}
                onConfigureTrigger={configureTrigger}
                onDeleteBehavior={removeWorkflow}
                onRemoveSelected={removeSelectedStep}
                profiles={rag.profiles}
                screenNodes={flatNodes}
                screens={state.document.screens.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  path: candidate.path,
                  routeParameters: candidate.routeParameters,
                }))}
              />
            </aside>
          </>
        )}
      </div>
    </section>
  );
}

function defaultEventForComponent(node: ComponentNode): TriggerEvent | null {
  switch (node.type) {
    case 'button':
    case 'gesture-detector':
    case 'container':
    case 'image':
    case 'text':
    case 'listview':
      return 'click';
    case 'input':
    case 'checkbox':
    case 'radio':
    case 'switch':
    case 'dropdown':
    case 'slider':
    case 'camera':
    case 'file-input':
    case 'chat':
      return 'change';
    case 'chart':
      return 'load';
    default:
      return null;
  }
}

function componentTypeLabel(node: ComponentNode): string {
  return node.type === 'gesture-detector'
    ? 'Gesture Detector'
    : node.type === 'input'
      ? 'Text field'
      : node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

function currentItemDefinitions(collectionId: string, collectionName: string): LogicNodeDefinition[] {
  const itemName = singularize(collectionName);
  const currentId = { source: 'list-item' as const, fieldId: CURRENT_ITEM_ID_FIELD };
  return [
    {
      id: `current-update-${collectionId}`,
      category: 'Current item',
      label: `Update current ${itemName}`,
      description: `Change fields on the ${itemName} that was clicked`,
      icon: '✓',
      keywords: ['current', itemName, 'update', 'edit'],
      create: () => ({
        kind: 'action',
        payload: { type: 'update-record', collectionId, recordId: '', values: {} },
        inputMappings: { $recordId: currentId },
      }),
    },
    {
      id: `current-delete-${collectionId}`,
      category: 'Current item',
      label: `Delete current ${itemName}`,
      description: `Delete the ${itemName} that was clicked`,
      icon: '×',
      keywords: ['current', itemName, 'delete', 'remove'],
      create: () => ({
        kind: 'action',
        payload: { type: 'delete-record', collectionId, recordId: '', confirm: true },
        inputMappings: { $recordId: currentId },
      }),
    },
    {
      id: `current-open-${collectionId}`,
      category: 'Current item',
      label: `Open current ${itemName}`,
      description: `Open a detail screen with this ${itemName}`,
      icon: '→',
      keywords: ['current', itemName, 'open', 'navigate', 'detail'],
      create: () => ({
        kind: 'action',
        payload: { type: 'navigate', targetScreenId: '', recordContext: { collectionId, recordId: '' } },
        inputMappings: { $recordId: currentId },
      }),
    },
  ];
}

function singularize(value: string): string {
  const trimmed = value.trim();
  if (/ies$/i.test(trimmed)) return `${trimmed.slice(0, -3)}y`;
  if (/s$/i.test(trimmed) && !/ss$/i.test(trimmed)) return trimmed.slice(0, -1);
  return trimmed || 'item';
}

function findNearestListView(
  nodes: readonly ComponentNode[],
  targetId: string,
  nearest: ListViewNode | null = null,
): ListViewNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return nearest;
    if (!isChildBearingNode(node)) continue;
    const result = findNearestListView(node.children, targetId, node.type === 'listview' ? node : nearest);
    if (result) return result;
  }
  return null;
}
