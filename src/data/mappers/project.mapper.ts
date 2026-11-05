import type { ComponentNode } from '@domain/entities/componentNode';
import type { Behavior, LogicEdge, LogicGraph, LogicNode } from '@domain/entities/logic';
import type { Project, ProjectSummary } from '@domain/entities/project';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type {
  BehaviorDTO,
  ComponentNodeDTO,
  LogicEdgeDTO,
  LogicGraphDTO,
  LogicNodeDTO,
  ProjectDTO,
  ScreenDTO,
} from '../dto/project.dto';

/*
 * Domain <-> DTO boundaries. Dates become ISO-8601 strings on the wire; node
 * and logic unions are mapped explicitly so the presentation layer never sees
 * API-shaped fixtures.
 */

export function mapProjectToDto(project: Project): ProjectDTO {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    screens: project.document.screens.map(mapScreenToDto),
  };
}

export function mapProjectFromDto(dto: ProjectDTO): Project {
  const document: ProjectDocument = {
    screens: dto.screens.map(mapScreenFromDto),
  };
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    document,
  };
}

export function mapProjectToSummary(project: Project): ProjectSummary {
  const firstScreen = project.document.screens[0] ?? null;
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    screenCount: project.document.screens.length,
    previewScreen: firstScreen,
  };
}

export function mapScreenToDto(screen: Screen): ScreenDTO {
  return {
    id: screen.id,
    name: screen.name,
    nodes: screen.nodes.map(mapNodeToDto),
    behaviors: screen.behaviors.map(mapBehaviorToDto),
    logicGraphs: screen.logicGraphs.map(mapLogicGraphToDto),
  };
}

export function mapScreenFromDto(dto: ScreenDTO): Screen {
  return {
    id: dto.id,
    name: dto.name,
    nodes: dto.nodes.map(mapNodeFromDto),
    behaviors: dto.behaviors.map(mapBehaviorFromDto),
    logicGraphs: dto.logicGraphs.map(mapLogicGraphFromDto),
  };
}

function mapNodeToDto(node: ComponentNode): ComponentNodeDTO {
  switch (node.type) {
    case 'button':
      return {
        id: node.id,
        type: 'button',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, variant: node.props.variant },
      };
    case 'text':
      return {
        id: node.id,
        type: 'text',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { text: node.props.text, level: node.props.level },
      };
    case 'input':
      return {
        id: node.id,
        type: 'input',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, placeholder: node.props.placeholder },
      };
    case 'image':
      return {
        id: node.id,
        type: 'image',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { src: node.props.src, alt: node.props.alt, fit: node.props.fit },
      };
    case 'list':
      return {
        id: node.id,
        type: 'list',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { items: [...node.props.items] },
      };
    case 'container':
      return {
        id: node.id,
        type: 'container',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {},
        children: node.children.map(mapNodeToDto),
      };
  }
}

function mapNodeFromDto(dto: ComponentNodeDTO): ComponentNode {
  switch (dto.type) {
    case 'button':
      return {
        id: dto.id,
        type: 'button',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, variant: dto.props.variant },
      };
    case 'text':
      return {
        id: dto.id,
        type: 'text',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { text: dto.props.text, level: dto.props.level },
      };
    case 'input':
      return {
        id: dto.id,
        type: 'input',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, placeholder: dto.props.placeholder },
      };
    case 'image':
      return {
        id: dto.id,
        type: 'image',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { src: dto.props.src, alt: dto.props.alt, fit: dto.props.fit },
      };
    case 'list':
      return {
        id: dto.id,
        type: 'list',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { items: [...dto.props.items] },
      };
    case 'container':
      return {
        id: dto.id,
        type: 'container',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {},
        children: dto.children.map(mapNodeFromDto),
      };
  }
}

function mapBehaviorToDto(behavior: Behavior): BehaviorDTO {
  return {
    id: behavior.id,
    name: behavior.name,
    event: behavior.event,
    graphId: behavior.graphId,
    targetNodeId: behavior.targetNodeId,
  };
}

function mapBehaviorFromDto(dto: BehaviorDTO): Behavior {
  return {
    id: dto.id,
    name: dto.name,
    event: dto.event,
    graphId: dto.graphId,
    targetNodeId: dto.targetNodeId,
  };
}

function mapLogicGraphToDto(graph: LogicGraph): LogicGraphDTO {
  return {
    id: graph.id,
    name: graph.name,
    sourceNodeId: graph.sourceNodeId,
    nodes: graph.nodes.map(mapLogicNodeToDto),
    edges: graph.edges.map(mapEdgeToDto),
  };
}

function mapLogicGraphFromDto(dto: LogicGraphDTO): LogicGraph {
  return {
    id: dto.id,
    name: dto.name,
    sourceNodeId: dto.sourceNodeId,
    nodes: dto.nodes.map(mapLogicNodeFromDto),
    edges: dto.edges.map(mapEdgeFromDto),
  };
}

function mapLogicNodeToDto(node: LogicNode): LogicNodeDTO {
  return { ...node };
}

function mapLogicNodeFromDto(dto: LogicNodeDTO): LogicNode {
  return { ...dto };
}

function mapEdgeToDto(edge: LogicEdge): LogicEdgeDTO {
  return { fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId };
}

function mapEdgeFromDto(dto: LogicEdgeDTO): LogicEdge {
  return { fromNodeId: dto.fromNodeId, toNodeId: dto.toNodeId };
}
