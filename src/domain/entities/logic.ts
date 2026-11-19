import type { DataValue, ListItemPlacement } from './appData';

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
  /** Optional repeated-record context carried to the destination screen. */
  recordContext?: { collectionId: string; recordId: string };
}

export interface GetRecordsPayload {
  type: 'get-records';
  collectionId: string;
}

export interface GetRecordPayload {
  type: 'get-record';
  collectionId: string;
  recordId: string;
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
  confirm?: boolean;
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

export interface DocumentUploadPayload {
  type: 'document-upload';
  mediaReference: string;
}

export interface ChatMessagePayload {
  type: 'chat-message';
  targetNodeId: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface DocumentLoadPayload {
  type: 'document-load';
  source: 'inline' | 'url' | 'collection' | 'file-reference' | 'previous-output';
  sourceReference: string;
  collectionId?: string;
  documentId: string;
  title: string;
  text: string;
  contentFieldId?: string;
  titleFieldId?: string;
  documentIdFieldId?: string;
  metadata: Record<string, string>;
}

export interface TextSplitPayload {
  type: 'text-split';
  strategy: 'recursive-character' | 'token';
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}

export interface EmbeddingGeneratePayload {
  type: 'embedding-generate';
  connectionProfileId: string;
  model: string;
  batchSize: number;
}

export interface VectorUpsertPayload {
  type: 'vector-upsert';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  conflictMode: 'upsert' | 'replace';
}

export interface VectorDeletePayload {
  type: 'vector-delete';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  documentId: string;
}

export interface ChatInputPayload {
  type: 'chat-input';
  componentId: string;
  staticQuestion: string;
}

export interface QueryEmbeddingPayload {
  type: 'query-embedding';
  connectionProfileId: string;
  model: string;
}

export interface VectorRetrievePayload {
  type: 'vector-retrieve';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  topK: number;
  minimumScore: number;
  metadataFilter: Record<string, string>;
}

export interface RerankPayload {
  type: 'rerank';
  connectionProfileId: string;
  model: string;
  topN: number;
  minimumScore: number;
}

export interface PromptTemplatePayload {
  type: 'prompt-template';
  template: string;
  contextSeparator: string;
  emptyContextBehavior: 'answer-without-context' | 'return-empty';
}

export interface LlmGeneratePayload {
  type: 'llm-generate';
  connectionProfileId: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatOutputPayload {
  type: 'chat-output';
  targetNodeId: string;
  citationsNodeId?: string;
}

export interface MemoryPayload {
  type: 'memory';
  operation: 'load' | 'append' | 'clear';
  connectionProfileId: string;
  scope: 'session' | 'user' | 'conversation';
  windowSize: number;
}

export interface VectorStorePayload {
  type: 'vector-store';
  operation: 'upsert' | 'delete' | 'retrieve-tool';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  documentInputMode: 'previous-output' | 'document-loader';
  conflictMode: 'upsert' | 'replace';
  documentId: string;
  topK: number;
  minimumScore: number;
}

export interface ChatModelPayload {
  type: 'chat-model';
  connectionProfileId: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AiAgentPayload {
  type: 'ai-agent';
  instructions: string;
  maxIterations: number;
  returnIntermediateSteps: boolean;
}

export interface CvLivenessPayload {
  type: 'cv-liveness';
  mediaReference: string;
}

export interface CvEnrollPayload {
  type: 'cv-enroll';
  mediaReference: string;
  userId: string;
  consent: boolean;
}

export interface CvVerifyPayload {
  type: 'cv-verify';
  mediaReference: string;
  userId?: string;
  credentialId?: string;
  threshold?: number;
}

export interface SetVariablePayload {
  type: 'set-variable';
  name: string;
  value: string;
}

export interface SetThemePayload {
  type: 'set-theme';
  theme: 'light' | 'dark' | 'system' | 'toggle';
}

export interface SetComponentValuePayload {
  type: 'set-component-value';
  targetNodeId: string;
  value: string;
}

/** Adds a session-only item to a static ListView without persistence or Project JSON mutation. */
export interface AddLocalListItemPayload {
  type: 'add-local-list-item';
  targetNodeId: string;
  placement: ListItemPlacement;
  values: Record<string, DataValue>;
}

export type ActionPayload =
  | ChangeTextPayload
  | ShowMessagePayload
  | NavigatePayload
  | GetRecordsPayload
  | GetRecordPayload
  | InsertRecordPayload
  | UpdateRecordPayload
  | DeleteRecordPayload
  | SendEmailPayload
  | RefreshCollectionPayload
  | DocumentUploadPayload
  | ChatMessagePayload
  | SetVariablePayload
  | SetThemePayload
  | SetComponentValuePayload
  | AddLocalListItemPayload
  | DocumentLoadPayload
  | TextSplitPayload
  | EmbeddingGeneratePayload
  | VectorUpsertPayload
  | VectorDeletePayload
  | ChatInputPayload
  | QueryEmbeddingPayload
  | VectorRetrievePayload
  | RerankPayload
  | PromptTemplatePayload
  | LlmGeneratePayload
  | ChatOutputPayload
  | MemoryPayload
  | VectorStorePayload
  | ChatModelPayload
  | AiAgentPayload
  | CvLivenessPayload
  | CvEnrollPayload
  | CvVerifyPayload;

export type SessionValuePath = 'user.id' | 'user.name' | 'user.email';

/** Reserved current-item field selector for the repeated record's stable ID. */
export const CURRENT_ITEM_ID_FIELD = '$id';

/** Serializable expression used to construct action inputs in the generated app/runtime. */
export type ValueExpression =
  | { source: 'literal'; value: string }
  | { source: 'component'; nodeId: string; property: 'value' | 'text' }
  | { source: 'list-item'; fieldId: string }
  | { source: 'session'; path: SessionValuePath }
  | { source: 'variable'; name: string }
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
  left: ValueExpression;
  operator: ConditionOperator;
  compareValue: string;
}

export type LogicNode = TriggerNode | ConditionNode | ActionNode;

export type LogicControlInputPort = 'in';
export type LogicControlOutputPort = 'next' | 'true' | 'false' | 'success' | 'error';
export type LogicResourcePort =
  | 'documents'
  | 'text-splitter'
  | 'embeddings'
  | 'chat-model'
  | 'memory'
  | 'tool'
  | 'reranker'
  | 'prompt-template';
export type LogicInputPort = LogicControlInputPort | LogicResourcePort;
export type LogicOutputPort = LogicControlOutputPort | LogicResourcePort;

export interface LogicEdge {
  id: string;
  fromNodeId: string;
  fromPort: LogicOutputPort;
  toNodeId: string;
  toPort: LogicInputPort;
  kind?: 'control' | 'resource';
}

export interface LogicGraph {
  id: string;
  name: string;
  /** Id of the screen component this graph was opened from. */
  sourceNodeId: string;
  purpose?: 'ui' | 'ingestion' | 'chat';
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
