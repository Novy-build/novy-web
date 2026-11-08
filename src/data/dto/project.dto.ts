/**
 * DTOs mirroring the future API payloads for projects, screens, components
 * and logic. Dates serialize as ISO-8601 strings over the wire.
 */

export interface ComponentNodeDTOBase {
  id: string;
  /** Optional for backward compatibility with documents saved before the Layers redesign. */
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  appearance?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: number;
    opacity?: number;
    dark?: { backgroundColor?: string; textColor?: string; borderColor?: string };
  };
  responsive?: Partial<Record<'tablet' | 'desktop', Partial<{ x: number; y: number; w: number; h: number; isHidden: boolean }>>>;
  bindings?: Array<{
    target: 'text.content' | 'image.source' | 'image.alt' | 'button.label' | 'checkbox.checked' | 'switch.checked' | 'progress.value' | 'component.visible';
    value: { source: 'list-item'; fieldId: string };
  }>;
}

export interface ButtonNodeDTO extends ComponentNodeDTOBase {
  type: 'button';
  props: { label: string; variant: 'solid' | 'outline' | 'text' };
}

export interface TextNodeDTO extends ComponentNodeDTOBase {
  type: 'text';
  props: {
    text: string;
    level: 'display' | 'title' | 'body';
    dataBinding?: { source: 'list-item'; fieldId: string };
  };
}

export interface InputNodeDTO extends ComponentNodeDTOBase {
  type: 'input';
  props: { label: string; placeholder: string; inputType?: 'text' | 'email' | 'password' | 'number'; multiline?: boolean };
}

export interface ImageNodeDTO extends ComponentNodeDTOBase {
  type: 'image';
  props: { src: string; alt: string; fit: 'cover' | 'contain' };
}

export interface ContainerNodeDTO extends ComponentNodeDTOBase {
  type: 'container';
  props: Record<string, never>;
  children: ComponentNodeDTO[];
}

export interface ColumnNodeDTO extends ComponentNodeDTOBase {
  type: 'column';
  props: {
    mainAxisAlignment: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
    crossAxisAlignment: 'start' | 'center' | 'end' | 'stretch';
    gap: number;
    padding: number;
  };
  children: ComponentNodeDTO[];
}

export interface RowNodeDTO extends ComponentNodeDTOBase {
  type: 'row';
  props: ColumnNodeDTO['props'];
  children: ComponentNodeDTO[];
}

export interface ListViewNodeDTO extends ComponentNodeDTOBase {
  type: 'listview';
  props: {
    emptyText: string;
    showDividers: boolean;
    scrollDirection: 'vertical' | 'horizontal';
    crossAxisAlignment: 'start' | 'center' | 'end' | 'stretch';
    gap: number;
    padding: number;
    /** Added in schema v8; older documents omit both item-container values. */
    itemSpacing?: number;
    itemBorderRadius?: number;
    dataSource:
      | { kind: 'static'; items: string[] }
      | {
          kind: 'static';
          fields: Array<{ id: string; label: string; type: 'text' | 'number' | 'boolean' | 'date' }>;
          items: Array<{ id: string; values: Record<string, string | number | boolean | null> }>;
        }
      | { kind: 'collection'; collectionId: string; displayFieldIds: string[]; sortFieldId?: string; sortDirection?: 'asc' | 'desc'; searchFieldId?: string; searchComponentId?: string };
  };
  children: ComponentNodeDTO[];
}

/** Schema-v5 compatibility only; migrated to ListView on load. */
export interface LegacyListNodeDTO extends ComponentNodeDTOBase {
  type: 'list';
  props: {
    items: string[];
    scrollable?: boolean;
    showDividers?: boolean;
    dataSource?:
      | { kind: 'static' }
      | { kind: 'collection'; collectionId: string; displayFieldId: string };
  };
}

/** Schema-v5 compatibility only; migrated to ListView on load. */
export interface LegacyRepeaterNodeDTO extends ComponentNodeDTOBase {
  type: 'repeater';
  props: {
    emptyText?: string;
    showDividers?: boolean;
    dataSource?:
      | { kind: 'static'; items: string[] }
      | { kind: 'collection'; collectionId: string; displayFieldIds: string[]; sortFieldId?: string; sortDirection?: 'asc' | 'desc'; searchFieldId?: string; searchComponentId?: string };
  };
}

/** Schema-v5 compatibility only; migrated to a composed Column on load. */
export interface LegacyFormNodeDTO extends ComponentNodeDTOBase {
  type: 'form';
  props: {
    title: string;
    fields: Array<{
      label: string;
      placeholder: string;
      type: 'text' | 'email' | 'number';
    }>;
    submitLabel: string;
    dataBinding?: {
      collectionId: string;
      fields: Array<{ formFieldIndex: number; dataFieldId: string }>;
    };
  };
}

export interface CheckboxNodeDTO extends ComponentNodeDTOBase {
  type: 'checkbox';
  props: { label: string; checked: boolean };
}

export interface RadioNodeDTO extends ComponentNodeDTOBase {
  type: 'radio';
  props: { label: string; options: string[]; selectedIndex: number };
}

export interface SwitchNodeDTO extends ComponentNodeDTOBase {
  type: 'switch';
  props: { label: string; checked: boolean; controlsTheme?: boolean };
}

export interface DropdownNodeDTO extends ComponentNodeDTOBase {
  type: 'dropdown';
  props: { label: string; placeholder: string; options: string[]; selectedIndex: number; presentation?: 'select' | 'menu' };
}

export interface SliderNodeDTO extends ComponentNodeDTOBase {
  type: 'slider';
  props: { label: string; min: number; max: number; step: number; value: number };
}

export interface ProgressNodeDTO extends ComponentNodeDTOBase {
  type: 'progress';
  props: { label: string; value: number; indeterminate: boolean };
}

export interface DividerNodeDTO extends ComponentNodeDTOBase {
  type: 'divider';
  props: { orientation: 'horizontal' | 'vertical'; thickness: number };
}

export interface CameraNodeDTO extends ComponentNodeDTOBase {
  type: 'camera';
  props: { label: string; facingMode: 'user' | 'environment'; captureLabel: string };
}

export type ComponentNodeDTO =
  | ButtonNodeDTO
  | TextNodeDTO
  | InputNodeDTO
  | ImageNodeDTO
  | ContainerNodeDTO
  | ColumnNodeDTO
  | RowNodeDTO
  | ListViewNodeDTO
  | LegacyListNodeDTO
  | LegacyRepeaterNodeDTO
  | LegacyFormNodeDTO
  | CheckboxNodeDTO
  | RadioNodeDTO
  | SwitchNodeDTO
  | DropdownNodeDTO
  | SliderNodeDTO
  | ProgressNodeDTO
  | DividerNodeDTO
  | CameraNodeDTO;

export interface BehaviorDTO {
  id: string;
  name: string;
  event: 'click' | 'change' | 'load';
  graphId: string;
  targetNodeId: string;
}

export interface TriggerNodeDTO {
  kind: 'trigger';
  id: string;
  event: 'click' | 'change' | 'load';
  position?: { x: number; y: number };
}

export interface ChangeTextPayloadDTO {
  type: 'change-text';
  targetNodeId: string;
  text: string;
}

export interface ShowMessagePayloadDTO {
  type: 'show-message';
  message: string;
}

export interface NavigatePayloadDTO {
  type: 'navigate';
  targetScreenId: string;
}

export interface GetRecordsPayloadDTO {
  type: 'get-records';
  collectionId: string;
}

export interface GetRecordPayloadDTO {
  type: 'get-record';
  collectionId: string;
  recordId: string;
}

export interface InsertRecordPayloadDTO {
  type: 'insert-record';
  collectionId: string;
  values: Record<string, string>;
}

export interface UpdateRecordPayloadDTO {
  type: 'update-record';
  collectionId: string;
  recordId: string;
  values: Record<string, string>;
}

export interface DeleteRecordPayloadDTO {
  type: 'delete-record';
  collectionId: string;
  recordId: string;
  confirm?: boolean;
}

export interface SendEmailPayloadDTO {
  type: 'send-email';
  to: string;
  subject: string;
  body: string;
}

export interface RefreshCollectionPayloadDTO {
  type: 'refresh-collection';
  collectionId: string;
}

/** Schema-v3 compatibility only; migrated to granular schema-v4 nodes on load. */
export interface LegacyRagIndexPayloadDTO {
  type: 'rag-index';
  knowledgeBaseId?: string;
  documentId: string;
  title: string;
  content: string;
}

export interface LegacyRagQueryPayloadDTO {
  type: 'rag-query';
  knowledgeBaseId?: string;
  query: string;
  topK?: number;
}

export interface LegacyRagRemovePayloadDTO {
  type: 'rag-remove';
  knowledgeBaseId?: string;
  documentId: string;
}

export interface DocumentLoadPayloadDTO {
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

export interface TextSplitPayloadDTO {
  type: 'text-split';
  strategy: 'recursive-character' | 'token';
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}

export interface EmbeddingGeneratePayloadDTO {
  type: 'embedding-generate';
  connectionProfileId: string;
  model: string;
  batchSize: number;
}

export interface VectorUpsertPayloadDTO {
  type: 'vector-upsert';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  conflictMode: 'upsert' | 'replace';
}

export interface VectorDeletePayloadDTO {
  type: 'vector-delete';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  documentId: string;
}

export interface ChatInputPayloadDTO {
  type: 'chat-input';
  componentId: string;
  staticQuestion: string;
}

export interface QueryEmbeddingPayloadDTO {
  type: 'query-embedding';
  connectionProfileId: string;
  model: string;
}

export interface VectorRetrievePayloadDTO {
  type: 'vector-retrieve';
  connectionProfileId: string;
  indexName: string;
  namespace: string;
  topK: number;
  minimumScore: number;
  metadataFilter: Record<string, string>;
}

export interface RerankPayloadDTO {
  type: 'rerank';
  connectionProfileId: string;
  model: string;
  topN: number;
  minimumScore: number;
}

export interface PromptTemplatePayloadDTO {
  type: 'prompt-template';
  template: string;
  contextSeparator: string;
  emptyContextBehavior: 'answer-without-context' | 'return-empty';
}

export interface LlmGeneratePayloadDTO {
  type: 'llm-generate';
  connectionProfileId: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatOutputPayloadDTO {
  type: 'chat-output';
  targetNodeId: string;
  citationsNodeId?: string;
}

export interface MemoryPayloadDTO {
  type: 'memory';
  operation: 'load' | 'append' | 'clear';
  connectionProfileId: string;
  scope: 'session' | 'user' | 'conversation';
  windowSize: number;
}

export interface VectorStorePayloadDTO {
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

export interface ChatModelPayloadDTO {
  type: 'chat-model';
  connectionProfileId: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AiAgentPayloadDTO {
  type: 'ai-agent';
  instructions: string;
  maxIterations: number;
  returnIntermediateSteps: boolean;
}

export interface CvLivenessPayloadDTO {
  type: 'cv-liveness';
  mediaReference: string;
}

export interface CvEnrollPayloadDTO {
  type: 'cv-enroll';
  mediaReference: string;
  userId: string;
  consent: boolean;
}

export interface CvVerifyPayloadDTO {
  type: 'cv-verify';
  mediaReference: string;
  userId?: string;
  credentialId?: string;
  threshold?: number;
}

export interface SetVariablePayloadDTO {
  type: 'set-variable';
  name: string;
  value: string;
}

export interface SetComponentValuePayloadDTO {
  type: 'set-component-value';
  targetNodeId: string;
  value: string;
}

export interface AddLocalListItemPayloadDTO {
  type: 'add-local-list-item';
  targetNodeId: string;
  placement: 'append' | 'prepend';
  values: Record<string, string | number | boolean | null>;
}

export type ActionPayloadDTO =
  | ChangeTextPayloadDTO
  | ShowMessagePayloadDTO
  | NavigatePayloadDTO
  | GetRecordsPayloadDTO
  | GetRecordPayloadDTO
  | InsertRecordPayloadDTO
  | UpdateRecordPayloadDTO
  | DeleteRecordPayloadDTO
  | SendEmailPayloadDTO
  | RefreshCollectionPayloadDTO
  | SetVariablePayloadDTO
  | SetComponentValuePayloadDTO
  | AddLocalListItemPayloadDTO
  | LegacyRagIndexPayloadDTO
  | LegacyRagQueryPayloadDTO
  | LegacyRagRemovePayloadDTO
  | DocumentLoadPayloadDTO
  | TextSplitPayloadDTO
  | EmbeddingGeneratePayloadDTO
  | VectorUpsertPayloadDTO
  | VectorDeletePayloadDTO
  | ChatInputPayloadDTO
  | QueryEmbeddingPayloadDTO
  | VectorRetrievePayloadDTO
  | RerankPayloadDTO
  | PromptTemplatePayloadDTO
  | LlmGeneratePayloadDTO
  | ChatOutputPayloadDTO
  | MemoryPayloadDTO
  | VectorStorePayloadDTO
  | ChatModelPayloadDTO
  | AiAgentPayloadDTO
  | CvLivenessPayloadDTO
  | CvEnrollPayloadDTO
  | CvVerifyPayloadDTO;

export type ValueExpressionDTO =
  | { source: 'literal'; value: string }
  | { source: 'component'; nodeId: string; property: 'value' | 'text' }
  | { source: 'list-item'; fieldId: string }
  | { source: 'session'; path: 'user.id' | 'user.name' | 'user.email' }
  | { source: 'variable'; name: string }
  | { source: 'node-output'; nodeId: string; path: string };

export interface ActionNodeDTO {
  kind: 'action';
  id: string;
  payload: ActionPayloadDTO;
  inputMappings?: Record<string, ValueExpressionDTO>;
  position?: { x: number; y: number };
}

export interface ConditionNodeDTO {
  kind: 'condition';
  id: string;
  position?: { x: number; y: number };
  left: ValueExpressionDTO;
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'is-empty' | 'is-not-empty';
  compareValue: string;
}

export type LogicNodeDTO = TriggerNodeDTO | ConditionNodeDTO | ActionNodeDTO;

export interface LogicEdgeDTO {
  id?: string;
  fromNodeId: string;
  fromPort?: 'next' | 'true' | 'false' | 'success' | 'error' | 'documents' | 'text-splitter' | 'embeddings' | 'chat-model' | 'memory' | 'tool' | 'reranker' | 'prompt-template';
  toNodeId: string;
  toPort?: 'in' | 'documents' | 'text-splitter' | 'embeddings' | 'chat-model' | 'memory' | 'tool' | 'reranker' | 'prompt-template';
  kind?: 'control' | 'resource';
}

export interface LogicGraphDTO {
  id: string;
  name: string;
  sourceNodeId: string;
  purpose?: 'ui' | 'ingestion' | 'chat';
  nodes: LogicNodeDTO[];
  edges: LogicEdgeDTO[];
}

export interface ScreenDTO {
  id: string;
  name: string;
  path?: string;
  nodes: ComponentNodeDTO[];
  behaviors: BehaviorDTO[];
  logicGraphs: LogicGraphDTO[];
}

export interface ProjectDTO {
  schemaVersion?: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  screens: ScreenDTO[];
}

/** Shape of the localStorage bucket (and future GET /projects response). */
export interface ProjectCollectionDTO {
  projects: ProjectDTO[];
}
