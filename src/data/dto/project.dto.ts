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
  };
  responsive?: Partial<Record<'tablet' | 'desktop', Partial<{ x: number; y: number; w: number; h: number; isHidden: boolean }>>>;
}

export interface ButtonNodeDTO extends ComponentNodeDTOBase {
  type: 'button';
  props: { label: string; variant: 'solid' | 'outline' | 'text' };
}

export interface TextNodeDTO extends ComponentNodeDTOBase {
  type: 'text';
  props: { text: string; level: 'display' | 'title' | 'body' };
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

export interface ListNodeDTO extends ComponentNodeDTOBase {
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

export interface RepeaterNodeDTO extends ComponentNodeDTOBase {
  type: 'repeater';
  props: {
    emptyText?: string;
    showDividers?: boolean;
    dataSource?:
      | { kind: 'static'; items: string[] }
      | { kind: 'collection'; collectionId: string; displayFieldIds: string[]; sortFieldId?: string; sortDirection?: 'asc' | 'desc'; searchFieldId?: string; searchComponentId?: string };
  };
}

export interface FormNodeDTO extends ComponentNodeDTOBase {
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
  props: { label: string; checked: boolean };
}

export interface DropdownNodeDTO extends ComponentNodeDTOBase {
  type: 'dropdown';
  props: { label: string; placeholder: string; options: string[]; selectedIndex: number };
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
  | ListNodeDTO
  | RepeaterNodeDTO
  | FormNodeDTO
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

export interface RagIndexPayloadDTO {
  type: 'rag-index';
  knowledgeBaseId?: string;
  documentId: string;
  title: string;
  content: string;
}

export interface RagQueryPayloadDTO {
  type: 'rag-query';
  knowledgeBaseId?: string;
  query: string;
  topK?: number;
}

export interface RagRemovePayloadDTO {
  type: 'rag-remove';
  knowledgeBaseId?: string;
  documentId: string;
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
  | RagIndexPayloadDTO
  | RagQueryPayloadDTO
  | RagRemovePayloadDTO
  | CvLivenessPayloadDTO
  | CvEnrollPayloadDTO
  | CvVerifyPayloadDTO;

export type ValueExpressionDTO =
  | { source: 'literal'; value: string }
  | { source: 'component'; nodeId: string; property: 'value' | 'text' }
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
  fromPort?: 'next' | 'true' | 'false' | 'success' | 'error';
  toNodeId: string;
  toPort?: 'in';
}

export interface LogicGraphDTO {
  id: string;
  name: string;
  sourceNodeId: string;
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
