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
}

export interface ButtonNodeDTO extends ComponentNodeDTOBase {
  type: 'button';
  props: { label: string; variant: 'solid' | 'outline' };
}

export interface TextNodeDTO extends ComponentNodeDTOBase {
  type: 'text';
  props: { text: string; level: 'display' | 'title' | 'body' };
}

export interface InputNodeDTO extends ComponentNodeDTOBase {
  type: 'input';
  props: { label: string; placeholder: string };
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
    dataSource?:
      | { kind: 'static' }
      | { kind: 'collection'; collectionId: string; displayFieldId: string };
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

export type ComponentNodeDTO =
  | ButtonNodeDTO
  | TextNodeDTO
  | InputNodeDTO
  | ImageNodeDTO
  | ContainerNodeDTO
  | ListNodeDTO
  | FormNodeDTO;

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

export type ActionPayloadDTO =
  | ChangeTextPayloadDTO
  | ShowMessagePayloadDTO
  | NavigatePayloadDTO
  | GetRecordsPayloadDTO
  | InsertRecordPayloadDTO
  | UpdateRecordPayloadDTO
  | DeleteRecordPayloadDTO;

export interface ActionNodeDTO {
  kind: 'action';
  id: string;
  payload: ActionPayloadDTO;
  position?: { x: number; y: number };
}

export interface ConditionNodeDTO {
  kind: 'condition';
  id: string;
  position?: { x: number; y: number };
  left: {
    source: 'component';
    nodeId: string;
    property: 'value' | 'text';
  };
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'is-empty' | 'is-not-empty';
  compareValue: string;
}

export type LogicNodeDTO = TriggerNodeDTO | ConditionNodeDTO | ActionNodeDTO;

export interface LogicEdgeDTO {
  id?: string;
  fromNodeId: string;
  fromPort?: 'next' | 'true' | 'false';
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
