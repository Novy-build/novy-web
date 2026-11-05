import type {
  ActionNode,
  ActionPayload,
  Behavior,
  ConditionNode,
  LogicGraph,
  LogicNodePosition,
  TriggerEvent,
  TriggerNode,
} from '../entities/logic';
import { generateId } from '../ids';

/**
 * Factories for the Logic workspace: a Behavior (component event binding)
 * pairs with a LogicGraph containing the trigger node, so every behavior
 * renders as an editable graph from the moment it exists.
 */
export function createTriggerNode(
  event: TriggerEvent,
  position: LogicNodePosition = { x: 80, y: 160 },
): TriggerNode {
  return { kind: 'trigger', id: generateId('logic'), event, position };
}

export function createActionNode(
  payload: ActionPayload,
  position: LogicNodePosition = { x: 312, y: 160 },
): ActionNode {
  return { kind: 'action', id: generateId('logic'), payload, position };
}

export function createConditionNode(
  position: LogicNodePosition = { x: 312, y: 160 },
): ConditionNode {
  return {
    kind: 'condition',
    id: generateId('logic'),
    position,
    left: { source: 'component', nodeId: '', property: 'value' },
    operator: 'equals',
    compareValue: '',
  };
}

/** Ready-made action step for "show a message", used by graphs and demos. */
export function createShowMessageAction(message: string): ActionNode {
  return createActionNode({ type: 'show-message', message });
}

/** Default first step: change-text with an unfilled config the user completes. */
export function createDefaultActionPayload(): ActionPayload {
  return { type: 'change-text', targetNodeId: '', text: '' };
}

export interface CreateLogicGraphOptions {
  name: string;
  sourceNodeId: string;
  event: TriggerEvent;
  triggerPosition?: LogicNodePosition;
  /** Optional pre-wired first step connected to the trigger. */
  starterAction?: ActionNode;
}

export function createLogicGraph(options: CreateLogicGraphOptions): LogicGraph {
  const trigger = createTriggerNode(options.event, options.triggerPosition);
  const graph: LogicGraph = {
    id: generateId('graph'),
    name: options.name,
    sourceNodeId: options.sourceNodeId,
    nodes: [trigger],
    edges: [],
  };
  if (options.starterAction) {
    graph.nodes = [...graph.nodes, options.starterAction];
    graph.edges = [{
      id: generateId('edge'),
      fromNodeId: trigger.id,
      fromPort: 'next',
      toNodeId: options.starterAction.id,
      toPort: 'in',
    }];
  }
  return graph;
}

export function createBehavior(name: string, event: TriggerEvent, graphId: string, targetNodeId: string): Behavior {
  return {
    id: generateId('behavior'),
    name,
    event,
    graphId,
    targetNodeId,
  };
}

export interface BehaviorBundle {
  behavior: Behavior;
  graph: LogicGraph;
}

/** Creates the behavior ↔ graph pair for one component event binding. */
export function createBehaviorBundle(name: string, targetNodeId: string, event: TriggerEvent): BehaviorBundle {
  const graph = createLogicGraph({ name, sourceNodeId: targetNodeId, event });
  const behavior = createBehavior(name, event, graph.id, targetNodeId);
  return { behavior, graph };
}
