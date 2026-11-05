import type { ActionNode, Behavior, LogicEdge, LogicGraph, LogicNode, ShowMessagePayload, TriggerEvent, TriggerNode } from '../entities/logic';
import { generateId } from '../ids';

export function createTriggerNode(event: TriggerEvent): TriggerNode {
  return { kind: 'trigger', id: generateId('logicnode'), event };
}

export function createShowMessageAction(message: string): ActionNode {
  const payload: ShowMessagePayload = { type: 'show-message', message };
  return { kind: 'action', id: generateId('logicnode'), payload };
}

export function connectLogicNodes(from: LogicNode, to: LogicNode): LogicEdge {
  return { fromNodeId: from.id, toNodeId: to.id };
}

export interface CreateLogicGraphInput {
  name: string;
  sourceNodeId: string;
  event: TriggerEvent;
  /** Optional starter action wired after the trigger (e.g. Show message). */
  starterAction?: ActionNode;
}

/** Creates a trigger node plus optional wired starter action. */
export function createLogicGraph(input: CreateLogicGraphInput): LogicGraph {
  const trigger = createTriggerNode(input.event);
  const nodes: LogicNode[] = [trigger];
  const edges: LogicEdge[] = [];

  if (input.starterAction) {
    nodes.push(input.starterAction);
    edges.push(connectLogicNodes(trigger, input.starterAction));
  }

  return {
    id: generateId('graph'),
    name: input.name,
    sourceNodeId: input.sourceNodeId,
    nodes,
    edges,
  };
}

export function createBehavior(name: string, event: TriggerEvent, graphId: string, targetNodeId: string): Behavior {
  return { id: generateId('behavior'), name, event, graphId, targetNodeId };
}
