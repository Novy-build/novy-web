/**
 * DTOs mirroring the future API payloads for projects, screens, components
 * and logic. Dates serialize as ISO-8601 strings over the wire.
 */

export interface ComponentNodeDTOBase {
  id: string;
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
  props: { items: string[] };
}

export type ComponentNodeDTO =
  | ButtonNodeDTO
  | TextNodeDTO
  | InputNodeDTO
  | ImageNodeDTO
  | ContainerNodeDTO
  | ListNodeDTO;

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

export type ActionPayloadDTO = ChangeTextPayloadDTO | ShowMessagePayloadDTO | NavigatePayloadDTO;

export interface ActionNodeDTO {
  kind: 'action';
  id: string;
  payload: ActionPayloadDTO;
}

export type LogicNodeDTO = TriggerNodeDTO | ActionNodeDTO;

export interface LogicEdgeDTO {
  fromNodeId: string;
  toNodeId: string;
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
