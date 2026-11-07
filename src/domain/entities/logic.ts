/**
 * Visual logic model used by the Logic workspace (Phase 5).
 * A Behavior binds a component event to a LogicGraph; the graph is a small
 * trigger -> action chain rendered as connected node cards.
 */
export type TriggerEvent = 'click' | 'change' | 'load';

export interface LogicNodePosition {
  x: number;
  y: number;
}

export interface TriggerNode {
  kind: 'trigger';
  id: string;
  event: TriggerEvent;
  position: LogicNodePosition;
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

export interface GetRecordsPayload {
  type: 'get-records';
  collectionId: string;
}

export interface InsertRecordPayload {
  type: 'insert-record';
  collectionId: string;
  values: Record<string, string>;
}

export interface UpdateRecordPayload {
  type: 'update-record';
  collectionId: string;
  recordId: string;
  values: Record<string, string>;
}

export interface DeleteRecordPayload {
  type: 'delete-record';
  collectionId: string;
  recordId: string;
}

export interface SendEmailPayload {
  type: 'send-email';
  to: string;
  subject: string;
  body: string;
}

export interface RefreshCollectionPayload {
  type: 'refresh-collection';
  collectionId: string;
}

export type ActionPayload =
  | ChangeTextPayload
  | ShowMessagePayload
  | NavigatePayload
  | GetRecordsPayload
  | InsertRecordPayload
  | UpdateRecordPayload
  | DeleteRecordPayload
  | SendEmailPayload
  | RefreshCollectionPayload;

export type SessionValuePath = 'user.id' | 'user.name' | 'user.email';

/** Serializable expression used to construct action inputs in the generated app/runtime. */
export type ValueExpression =
  | { source: 'literal'; value: string }
  | { source: 'component'; nodeId: string; property: 'value' | 'text' }
  | { source: 'session'; path: SessionValuePath }
  | { source: 'node-output'; nodeId: string; path: string };

export type ActionInputMappings = Record<string, ValueExpression>;

export interface ActionNode {
  kind: 'action';
  id: string;
  payload: ActionPayload;
  /** Named inputs override matching static payload fields at runtime. */
  inputMappings?: ActionInputMappings;
  position: LogicNodePosition;
}

export type ConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'is-empty'
  | 'is-not-empty';

export interface ComponentValueReference {
  source: 'component';
  nodeId: string;
  property: 'value' | 'text';
}

export interface ConditionNode {
  kind: 'condition';
  id: string;
  position: LogicNodePosition;
  left: ComponentValueReference;
  operator: ConditionOperator;
  compareValue: string;
}

export type LogicNode = TriggerNode | ConditionNode | ActionNode;

export type LogicInputPort = 'in';
export type LogicOutputPort = 'next' | 'true' | 'false' | 'success' | 'error';

export interface LogicEdge {
  id: string;
  fromNodeId: string;
  fromPort: LogicOutputPort;
  toNodeId: string;
  toPort: LogicInputPort;
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
