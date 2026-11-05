import { useEffect, useMemo, useState, type Dispatch } from 'react';
import type {
  ActionPayload,
  ConditionNode,
  LogicGraph,
  LogicOutputPort,
  TriggerEvent,
} from '@domain/entities/logic';
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
import { nodeDisplayLabel } from '../workspace/nodeLabels';

interface LogicWorkspaceProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const EMPTY_GRAPH: LogicGraph = {
  id: 'empty_logic_canvas',
  name: 'Empty workflow',
  sourceNodeId: '',
  nodes: [],
  edges: [],
};

/** n8n-inspired workspace: Nodes library, workflow canvas, and focused Details inspector. */
export function LogicWorkspace({ state, dispatch }: LogicWorkspaceProps) {
  const screen = getActiveScreen(state);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState('');

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

  function addLibraryNode(node: LogicLibraryNode, position = nextPosition()): void {
    setLibraryMessage('');
    if (node.kind === 'trigger') {
      dispatch({ type: 'workflow/create', event: node.event, position });
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
        : { kind: 'action', payload: node.payload },
      position,
    });
  }

  function removeSelectedStep(): void {
    if (behavior && graph && selectedNodeId) {
      dispatch({ type: 'graph/action-delete', graphId: graph.id, nodeId: selectedNodeId });
      setSelectedNodeId(null);
    }
  }

  function removeWorkflow(): void {
    if (behavior) {
      dispatch({ type: 'behavior/delete', behaviorId: behavior.id });
      setSelectedNodeId(null);
    }
  }

  function configureSelected(nodeId: string, payload: ActionPayload): void {
    if (graph) dispatch({ type: 'graph/action-update', graphId: graph.id, nodeId, payload });
  }

  function configureCondition(
    nodeId: string,
    patch: Partial<Pick<ConditionNode, 'left' | 'operator' | 'compareValue'>>,
  ): void {
    if (graph) dispatch({ type: 'graph/condition-update', graphId: graph.id, nodeId, patch });
  }

  function connectNodes(fromNodeId: string, fromPort: LogicOutputPort, toNodeId: string): void {
    if (graph) {
      dispatch({ type: 'graph/connect-ports', graphId: graph.id, fromNodeId, fromPort, toNodeId });
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
        <LogicNodeLibrary onAdd={addLibraryNode} />
        <div className="relative flex min-w-0 flex-1">
          <LogicGraphCanvas
            graph={renderedGraph}
            onConnect={connectNodes}
            onDeleteEdge={(edgeId) => graph && dispatch({ type: 'graph/edge-delete', graphId: graph.id, edgeId })}
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

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-hairline bg-surface p-4">
          <LogicNodeConfig
            behavior={behavior}
            currentScreenId={screen.id}
            node={selectedNode}
            onConfigure={configureSelected}
            onConfigureCondition={configureCondition}
            onConfigureTrigger={configureTrigger}
            onDeleteBehavior={removeWorkflow}
            onRemoveSelected={removeSelectedStep}
            screenNodes={flatNodes}
            screens={state.document.screens.map((candidate) => ({ id: candidate.id, name: candidate.name }))}
          />
        </aside>
      </div>
    </section>
  );
}
