/**
 * Visual logic model used by the Logic workspace (Phase 5).
 * A Behavior binds a component event to a LogicGraph; the graph is a small
 * trigger -> action chain rendered as connected node cards.
 */
export type TriggerEvent = 'click' | 'change' | 'load';

export interface TriggerNode {
  kind: 'trigger';
  id: string;
  event: TriggerEvent;
}

export interface ChangeTextPayload {
  type: 'change-text';
  targetNodeId: string;
  text: string;
}

export interface ShowMessagePayload {
  type: 'show-message';
  message: string;
}

export interface NavigatePayload {
  type: 'navigate';
  targetScreenId: string;
}

export type ActionPayload = ChangeTextPayload | ShowMessagePayload | NavigatePayload;

export interface ActionNode {
  kind: 'action';
  id: string;
  payload: ActionPayload;
}

export type LogicNode = TriggerNode | ActionNode;

export interface LogicEdge {
  fromNodeId: string;
  toNodeId: string;
}

export interface LogicGraph {
  id: string;
  name: string;
  /** Id of the screen component this graph was opened from. */
  sourceNodeId: string;
  nodes: LogicNode[];
  edges: LogicEdge[];
}

export interface Behavior {
  id: string;
  name: string;
  event: TriggerEvent;
  graphId: string;
  /** Component id the event is bound to. */
  targetNodeId: string;
}
