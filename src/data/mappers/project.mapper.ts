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
import { normalizeLogicGraph } from '@domain/logic/graph';

/*
 * Domain <-> DTO boundaries. Dates become ISO-8601 strings on the wire; node
 * and logic unions are mapped explicitly so the presentation layer never sees
 * API-shaped fixtures.
 */

export function mapProjectToDto(project: Project): ProjectDTO {
  return {
    schemaVersion: 3,
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    screens: project.document.screens.map(mapScreenToDto),
  };
}

export function mapProjectFromDto(dto: ProjectDTO): Project {
  const takenPaths = new Set(dto.screens.flatMap((screen) => screen.path ? [screen.path] : []));
  const document: ProjectDocument = {
    screens: dto.screens.map((screen, index) => {
      const mapped = mapScreenFromDto(screen, index);
      if (screen.path) return mapped;
      const path = uniqueMigratedScreenPath(mapped.path, index, takenPaths);
      takenPaths.add(path);
      return path === mapped.path ? mapped : { ...mapped, path };
    }),
  };
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    document,
  };
}

function uniqueMigratedScreenPath(
  candidate: string,
  index: number,
  takenPaths: ReadonlySet<string>,
): string {
  if (!takenPaths.has(candidate)) return candidate;
  const base = candidate === '/' ? `/screen-${index + 1}` : candidate;
  if (!takenPaths.has(base)) return base;
  let suffix = 2;
  while (takenPaths.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
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
    path: screen.path,
    nodes: screen.nodes.map(mapNodeToDto),
    behaviors: screen.behaviors.map(mapBehaviorToDto),
    logicGraphs: screen.logicGraphs.map(mapLogicGraphToDto),
  };
}

export function mapScreenFromDto(dto: ScreenDTO, index = 0): Screen {
  return {
    id: dto.id,
    name: dto.name,
    path: dto.path ?? (index === 0 ? '/' : `/${dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `screen-${index + 1}`}`),
    nodes: dto.nodes.map(mapNodeFromDto),
    behaviors: dto.behaviors.map(mapBehaviorFromDto),
    logicGraphs: dto.logicGraphs.map(mapLogicGraphFromDto),
  };
}

function mapNodeToDto(node: ComponentNode): ComponentNodeDTO {
  const editor = mapNodeEditorToDto(node);
  switch (node.type) {
    case 'button':
      return {
        id: node.id,
        ...editor,
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
        ...editor,
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
        ...editor,
        type: 'input',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, placeholder: node.props.placeholder, inputType: node.props.inputType, multiline: node.props.multiline },
      };
    case 'checkbox':
      return {
        id: node.id,
        ...editor,
        type: 'checkbox',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, checked: node.props.checked },
      };
    case 'radio':
      return {
        id: node.id,
        ...editor,
        type: 'radio',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, options: [...node.props.options], selectedIndex: node.props.selectedIndex },
      };
    case 'switch':
      return {
        id: node.id,
        ...editor,
        type: 'switch',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, checked: node.props.checked },
      };
    case 'dropdown':
      return {
        id: node.id,
        ...editor,
        type: 'dropdown',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, placeholder: node.props.placeholder, options: [...node.props.options], selectedIndex: node.props.selectedIndex },
      };
    case 'slider':
      return {
        id: node.id,
        ...editor,
        type: 'slider',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, min: node.props.min, max: node.props.max, step: node.props.step, value: node.props.value },
      };
    case 'progress':
      return {
        id: node.id,
        ...editor,
        type: 'progress',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, value: node.props.value, indeterminate: node.props.indeterminate },
      };
    case 'divider':
      return {
        id: node.id,
        ...editor,
        type: 'divider',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { orientation: node.props.orientation, thickness: node.props.thickness },
      };
    case 'camera':
      return {
        id: node.id,
        ...editor,
        type: 'camera',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { label: node.props.label, facingMode: node.props.facingMode, captureLabel: node.props.captureLabel },
      };
    case 'image':
      return {
        id: node.id,
        ...editor,
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
        ...editor,
        type: 'list',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          items: [...node.props.items],
          scrollable: node.props.scrollable,
          showDividers: node.props.showDividers,
          ...(node.props.dataSource ? { dataSource: structuredClone(node.props.dataSource) } : {}),
        },
      };
    case 'repeater':
      return {
        id: node.id,
        ...editor,
        type: 'repeater',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          emptyText: node.props.emptyText,
          showDividers: node.props.showDividers,
          ...(node.props.dataSource ? { dataSource: structuredClone(node.props.dataSource) } : {}),
        },
      };
    case 'container':
      return {
        id: node.id,
        ...editor,
        type: 'container',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {},
        children: node.children.map(mapNodeToDto),
      };
    case 'form':
      return {
        id: node.id,
        ...editor,
        type: 'form',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          title: node.props.title,
          fields: node.props.fields.map((field) => ({ ...field })),
          submitLabel: node.props.submitLabel,
          ...(node.props.dataBinding ? { dataBinding: structuredClone(node.props.dataBinding) } : {}),
        },
      };
  }
}

function mapNodeFromDto(dto: ComponentNodeDTO): ComponentNode {
  const editor = mapNodeEditorFromDto(dto);
  switch (dto.type) {
    case 'button':
      return {
        id: dto.id,
        ...editor,
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
        ...editor,
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
        ...editor,
        type: 'input',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          label: dto.props.label,
          placeholder: dto.props.placeholder,
          inputType: dto.props.inputType ?? 'text',
          multiline: dto.props.multiline ?? false,
        },
      };
    case 'checkbox':
      return {
        id: dto.id,
        ...editor,
        type: 'checkbox',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, checked: dto.props.checked },
      };
    case 'radio':
      return {
        id: dto.id,
        ...editor,
        type: 'radio',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, options: [...dto.props.options], selectedIndex: dto.props.selectedIndex },
      };
    case 'switch':
      return {
        id: dto.id,
        ...editor,
        type: 'switch',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, checked: dto.props.checked },
      };
    case 'dropdown':
      return {
        id: dto.id,
        ...editor,
        type: 'dropdown',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, placeholder: dto.props.placeholder, options: [...dto.props.options], selectedIndex: dto.props.selectedIndex },
      };
    case 'slider':
      return {
        id: dto.id,
        ...editor,
        type: 'slider',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, min: dto.props.min, max: dto.props.max, step: dto.props.step, value: dto.props.value },
      };
    case 'progress':
      return {
        id: dto.id,
        ...editor,
        type: 'progress',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, value: dto.props.value, indeterminate: dto.props.indeterminate },
      };
    case 'divider':
      return {
        id: dto.id,
        ...editor,
        type: 'divider',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { orientation: dto.props.orientation, thickness: dto.props.thickness },
      };
    case 'camera':
      return {
        id: dto.id,
        ...editor,
        type: 'camera',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { label: dto.props.label, facingMode: dto.props.facingMode, captureLabel: dto.props.captureLabel },
      };
    case 'image':
      return {
        id: dto.id,
        ...editor,
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
        ...editor,
        type: 'list',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          items: [...dto.props.items],
          scrollable: dto.props.scrollable ?? true,
          showDividers: dto.props.showDividers ?? true,
          ...(dto.props.dataSource ? { dataSource: structuredClone(dto.props.dataSource) } : {}),
        },
      };
    case 'repeater':
      return {
        id: dto.id,
        ...editor,
        type: 'repeater',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          emptyText: dto.props.emptyText ?? 'No records yet',
          showDividers: dto.props.showDividers ?? true,
          ...(dto.props.dataSource ? { dataSource: structuredClone(dto.props.dataSource) } : {}),
        },
      };
    case 'container':
      return {
        id: dto.id,
        ...editor,
        type: 'container',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {},
        children: dto.children.map(mapNodeFromDto),
      };
    case 'form':
      return {
        id: dto.id,
        ...editor,
        type: 'form',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          title: dto.props.title,
          fields: dto.props.fields.map((field) => ({ ...field })),
          submitLabel: dto.props.submitLabel,
          ...(dto.props.dataBinding ? { dataBinding: structuredClone(dto.props.dataBinding) } : {}),
        },
      };
  }
}

function mapNodeEditorToDto(
  node: ComponentNode,
): Partial<Pick<ComponentNodeDTO, 'name' | 'isHidden' | 'isLocked' | 'appearance' | 'responsive'>> {
  return compactEditorMetadata(node.name, node.isHidden, node.isLocked, node.appearance, node.responsive);
}

function mapNodeEditorFromDto(
  dto: ComponentNodeDTO,
): Partial<Pick<ComponentNode, 'name' | 'isHidden' | 'isLocked' | 'appearance' | 'responsive'>> {
  return compactEditorMetadata(dto.name, dto.isHidden, dto.isLocked, dto.appearance, dto.responsive);
}

function compactEditorMetadata(
  name: string | undefined,
  isHidden: boolean | undefined,
  isLocked: boolean | undefined,
  appearance: ComponentNode['appearance'],
  responsive: ComponentNode['responsive'],
): { name?: string; isHidden?: boolean; isLocked?: boolean; appearance?: ComponentNode['appearance']; responsive?: ComponentNode['responsive'] } {
  return {
    ...(name !== undefined ? { name } : {}),
    ...(isHidden !== undefined ? { isHidden } : {}),
    ...(isLocked !== undefined ? { isLocked } : {}),
    ...(appearance !== undefined ? { appearance: structuredClone(appearance) } : {}),
    ...(responsive !== undefined ? { responsive: structuredClone(responsive) } : {}),
  };
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
  const graph: LogicGraph = {
    id: dto.id,
    name: dto.name,
    sourceNodeId: dto.sourceNodeId,
    nodes: dto.nodes.map((node, index) => mapLogicNodeFromDto(node, index)),
    edges: dto.edges.map((edge, index) => mapEdgeFromDto(edge, dto.id, index)),
  };
  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  return normalizeLogicGraph(graph, trigger?.event ?? 'click');
}

function mapLogicNodeToDto(node: LogicNode): LogicNodeDTO {
  return structuredClone(node);
}

function mapLogicNodeFromDto(dto: LogicNodeDTO, index: number): LogicNode {
  const position = dto.position ?? { x: 80 + index * 232, y: 160 };
  return { ...structuredClone(dto), position };
}

function mapEdgeToDto(edge: LogicEdge): LogicEdgeDTO {
  return { ...edge };
}

function mapEdgeFromDto(dto: LogicEdgeDTO, graphId: string, index: number): LogicEdge {
  return {
    id: dto.id ?? `edge_${graphId}_${index + 1}`,
    fromNodeId: dto.fromNodeId,
    fromPort: dto.fromPort ?? 'next',
    toNodeId: dto.toNodeId,
    toPort: dto.toPort ?? 'in',
  };
}
