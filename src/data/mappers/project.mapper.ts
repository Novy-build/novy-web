import {
  geometryAtBreakpoint,
  isChildBearingNode,
  isHiddenAtBreakpoint,
  type ColumnNode,
  type ComponentNode,
  type ListViewDataSource,
  type ListViewNode,
  type NodeGeometry,
  type ResponsiveBreakpoint,
  type TextNode,
} from '@domain/entities/componentNode';
import type { ActionInputMappings, Behavior, LogicEdge, LogicGraph, LogicNode } from '@domain/entities/logic';
import type { Project, ProjectSummary } from '@domain/entities/project';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type {
  BehaviorDTO,
  ComponentNodeDTO,
  LegacyFormNodeDTO,
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
    schemaVersion: 10,
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    screens: project.document.screens.map(mapScreenToDto),
  };
}

export function mapProjectFromDto(dto: ProjectDTO): Project {
  const takenPaths = new Set(dto.screens.flatMap((screen) => screen.path ? [screen.path] : []));
  const mappedDocument: ProjectDocument = {
    screens: dto.screens.map((screen, index) => {
      const mapped = mapScreenFromDto(screen, index);
      if (screen.path) return mapped;
      const path = uniqueMigratedScreenPath(mapped.path, index, takenPaths);
      takenPaths.add(path);
      return path === mapped.path ? mapped : { ...mapped, path };
    }),
  };
  const document = (dto.schemaVersion ?? 0) < 9
    ? {
        screens: mappedDocument.screens.map((screen) => ({
          ...screen,
          nodes: migrateListViewItemsToFreeform(screen.nodes),
        })),
      }
    : mappedDocument;
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    document,
  };
}

/** Schema-v8 and older ListViews laid out direct children as an implicit flow. */
function migrateListViewItemsToFreeform(nodes: readonly ComponentNode[]): ComponentNode[] {
  return nodes.map((node) => {
    if (!isChildBearingNode(node)) return node;
    if (node.type !== 'listview') {
      return { ...node, children: migrateListViewItemsToFreeform(node.children) };
    }

    const mobile = legacyListViewChildGeometries(node, 'mobile');
    const tablet = legacyListViewChildGeometries(node, 'tablet');
    const desktop = legacyListViewChildGeometries(node, 'desktop');
    return {
      ...node,
      children: node.children.map((child) => migrateListViewItemsToFreeform([
        materializeFreeformGeometry(
          child,
          mobile.get(child.id) ?? geometryAtBreakpoint(child, 'mobile'),
          tablet.get(child.id) ?? geometryAtBreakpoint(child, 'tablet'),
          desktop.get(child.id) ?? geometryAtBreakpoint(child, 'desktop'),
        ),
      ])[0]!),
    };
  });
}

function materializeFreeformGeometry(
  node: ComponentNode,
  mobile: NodeGeometry,
  tablet: NodeGeometry,
  desktop: NodeGeometry,
): ComponentNode {
  const responsive = structuredClone(node.responsive ?? {});
  for (const [breakpoint, geometry, inherited] of [
    ['tablet', tablet, mobile],
    ['desktop', desktop, tablet],
  ] as const) {
    const override = { ...(responsive[breakpoint] ?? {}) };
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      if (geometry[field] === inherited[field]) delete override[field];
      else override[field] = geometry[field];
    }
    if (Object.keys(override).length > 0) responsive[breakpoint] = override;
    else delete responsive[breakpoint];
  }
  return {
    ...node,
    ...mobile,
    responsive: Object.keys(responsive).length > 0 ? responsive : undefined,
  };
}

/** Reproduces the schema-v8 direct-child flow before persisting its result. */
function legacyListViewChildGeometries(
  parent: ListViewNode,
  breakpoint: ResponsiveBreakpoint,
): ReadonlyMap<string, NodeGeometry> {
  const parentGeometry = geometryAtBreakpoint(parent, breakpoint);
  const direction = parent.props.scrollDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const padding = Math.max(0, parent.props.padding);
  const gap = Math.max(0, parent.props.gap);
  const resolved = new Map<string, NodeGeometry>();
  let cursor = padding;

  for (const child of parent.children) {
    const geometry = geometryAtBreakpoint(child, breakpoint);
    if (isHiddenAtBreakpoint(child, breakpoint)) {
      resolved.set(child.id, geometry);
      continue;
    }
    const crossSize = direction === 'vertical' ? parentGeometry.w : parentGeometry.h;
    const childCross = direction === 'vertical' ? geometry.w : geometry.h;
    const availableCross = Math.max(0, crossSize - padding * 2);
    let crossOffset = padding;
    if (parent.props.crossAxisAlignment === 'center') {
      crossOffset += Math.max(0, availableCross - childCross) / 2;
    }
    if (parent.props.crossAxisAlignment === 'end') {
      crossOffset += Math.max(0, availableCross - childCross);
    }
    const stretchedCross = parent.props.crossAxisAlignment === 'stretch' ? availableCross : childCross;
    resolved.set(child.id, direction === 'vertical'
      ? { x: crossOffset, y: cursor, w: stretchedCross, h: geometry.h }
      : { x: cursor, y: crossOffset, w: geometry.w, h: stretchedCross });
    cursor += (direction === 'vertical' ? geometry.h : geometry.w) + gap;
  }
  return resolved;
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
  const legacyFormMigrations = collectLegacyFormMigrations(dto.nodes);
  const behaviors = dto.behaviors.map(mapBehaviorFromDto);
  const logicGraphs = dto.logicGraphs.map(mapLogicGraphFromDto);
  return {
    id: dto.id,
    name: dto.name,
    path: dto.path ?? (index === 0 ? '/' : `/${dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `screen-${index + 1}`}`),
    nodes: dto.nodes.map(mapNodeFromDto),
    behaviors: [
      ...behaviors,
      ...legacyFormMigrations
        .map((migration) => migration.behavior)
        .filter((behavior) => !behaviors.some((candidate) => candidate.id === behavior.id)),
    ],
    logicGraphs: [
      ...logicGraphs,
      ...legacyFormMigrations
        .map((migration) => migration.graph)
        .filter((graph) => !logicGraphs.some((candidate) => candidate.id === graph.id)),
    ],
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
        props: {
          text: node.props.text,
          level: node.props.level,
        },
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
        props: { label: node.props.label, checked: node.props.checked, ...(node.props.controlsTheme ? { controlsTheme: true } : {}) },
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
        props: { label: node.props.label, placeholder: node.props.placeholder, options: [...node.props.options], selectedIndex: node.props.selectedIndex, ...(node.props.presentation === 'menu' ? { presentation: 'menu' } : {}) },
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
    case 'column':
      return {
        id: node.id,
        ...editor,
        type: 'column',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { ...node.props },
        children: node.children.map(mapNodeToDto),
      };
    case 'row':
      return {
        id: node.id,
        ...editor,
        type: 'row',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: { ...node.props },
        children: node.children.map(mapNodeToDto),
      };
    case 'listview':
      return {
        id: node.id,
        ...editor,
        type: 'listview',
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        props: {
          emptyText: node.props.emptyText,
          showDividers: node.props.showDividers,
          scrollDirection: node.props.scrollDirection,
          crossAxisAlignment: node.props.crossAxisAlignment,
          gap: node.props.gap,
          padding: node.props.padding,
          itemSpacing: node.props.itemSpacing,
          itemBorderRadius: node.props.itemBorderRadius,
          dataSource: structuredClone(node.props.dataSource),
        },
        children: node.children.map(mapNodeToDto),
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
        ...(dto.props.dataBinding && !dto.bindings?.some((binding) => binding.target === 'text.content')
          ? {
              bindings: [
                ...(dto.bindings ?? []),
                { target: 'text.content' as const, value: { ...dto.props.dataBinding } },
              ],
            }
          : {}),
        type: 'text',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          text: dto.props.text,
          level: dto.props.level,
        },
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
        props: { label: dto.props.label, checked: dto.props.checked, ...(dto.props.controlsTheme ? { controlsTheme: true } : {}) },
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
        props: { label: dto.props.label, placeholder: dto.props.placeholder, options: [...dto.props.options], selectedIndex: dto.props.selectedIndex, ...(dto.props.presentation === 'menu' ? { presentation: 'menu' } : {}) },
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
      return migrateLegacyListNode(dto, editor);
    case 'repeater':
      return migrateLegacyRepeaterNode(dto, editor);
    case 'column':
      return {
        id: dto.id,
        ...editor,
        type: 'column',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { ...dto.props },
        children: dto.children.map(mapNodeFromDto),
      };
    case 'row':
      return {
        id: dto.id,
        ...editor,
        type: 'row',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: { ...dto.props },
        children: dto.children.map(mapNodeFromDto),
      };
    case 'listview':
      return {
        id: dto.id,
        ...editor,
        type: 'listview',
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
        props: {
          emptyText: dto.props.emptyText,
          showDividers: dto.props.showDividers,
          scrollDirection: dto.props.scrollDirection,
          crossAxisAlignment: dto.props.crossAxisAlignment,
          gap: dto.props.gap,
          padding: dto.props.padding,
          itemSpacing: dto.props.itemSpacing ?? 0,
          itemBorderRadius: dto.props.itemBorderRadius ?? 0,
          dataSource: mapListViewDataSourceFromDto(dto.props.dataSource, dto.id),
        },
        children: dto.children.map(mapNodeFromDto),
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
      return migrateLegacyFormNode(dto, editor);
  }
}

type NodeEditorMetadata = Partial<Pick<ComponentNode, 'name' | 'isHidden' | 'isLocked' | 'appearance' | 'responsive' | 'bindings'>>;

function mapListViewDataSourceFromDto(
  source: Extract<ComponentNodeDTO, { type: 'listview' }>['props']['dataSource'],
  listViewId: string,
): ListViewDataSource {
  if (source.kind === 'collection') return structuredClone(source);
  if ('fields' in source) return structuredClone(source);
  return migrateStaticStrings(source.items, listViewId);
}

function migrateStaticStrings(items: readonly string[], listViewId: string): ListViewDataSource {
  return {
    kind: 'static',
    fields: [{ id: 'value', label: 'Value', type: 'text' }],
    items: items.map((value, index) => ({
      id: `${listViewId}__static_${index + 1}`,
      values: { value },
    })),
  };
}

function migrateLegacyListNode(
  dto: Extract<ComponentNodeDTO, { type: 'list' }>,
  editor: NodeEditorMetadata,
): ComponentNode {
  const source: ListViewDataSource = dto.props.dataSource?.kind === 'collection'
    ? {
        kind: 'collection',
        collectionId: dto.props.dataSource.collectionId,
        displayFieldIds: [dto.props.dataSource.displayFieldId],
      }
    : migrateStaticStrings(dto.props.items, dto.id);
  const fieldId = source.kind === 'collection' ? source.displayFieldIds[0] || 'value' : 'value';
  return {
    id: dto.id,
    ...editor,
    type: 'listview',
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
    props: {
      emptyText: 'No items yet',
      showDividers: dto.props.showDividers ?? true,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: 0,
      itemSpacing: 0,
      itemBorderRadius: 0,
      dataSource: source,
    },
    children: [boundItemText(`${dto.id}__item_text`, fieldId, Math.max(1, dto.w), 44)],
  };
}

function migrateLegacyRepeaterNode(
  dto: Extract<ComponentNodeDTO, { type: 'repeater' }>,
  editor: NodeEditorMetadata,
): ComponentNode {
  const source: ListViewDataSource = dto.props.dataSource?.kind === 'collection'
    ? structuredClone(dto.props.dataSource)
    : migrateStaticStrings(dto.props.dataSource?.items ?? [], dto.id);
  const fieldIds = source.kind === 'collection'
    ? source.displayFieldIds
    : ['title', 'snippet'];
  return {
    id: dto.id,
    ...editor,
    type: 'listview',
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
    props: {
      emptyText: dto.props.emptyText ?? 'No records yet',
      showDividers: dto.props.showDividers ?? true,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: 0,
      itemSpacing: 0,
      itemBorderRadius: 0,
      dataSource: source,
    },
    children: (fieldIds.length > 0 ? fieldIds : ['value']).map((fieldId, index) =>
      boundItemText(`${dto.id}__item_text_${index}`, fieldId, Math.max(1, dto.w), 24)),
  };
}

function boundItemText(id: string, fieldId: string, width: number, height: number): TextNode {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    w: width,
    h: height,
    props: {
      text: fieldId === 'value' ? 'List item' : fieldId,
      level: 'body',
    },
    bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId } }],
  };
}

function migrateLegacyFormNode(dto: LegacyFormNodeDTO, editor: NodeEditorMetadata): ColumnNode {
  const contentWidth = Math.max(1, dto.w - 32);
  const title: TextNode = {
    id: `${dto.id}__title`,
    type: 'text',
    x: 0,
    y: 0,
    w: contentWidth,
    h: 28,
    props: { text: dto.props.title, level: 'title' },
  };
  const fields: ComponentNode[] = dto.props.fields.map((field, index) => ({
    id: `${dto.id}__field_${index}`,
    type: 'input',
    x: 0,
    y: 0,
    w: contentWidth,
    h: 44,
    props: {
      label: field.label,
      placeholder: field.placeholder,
      inputType: field.type,
      multiline: false,
    },
  }));
  const submit: ComponentNode = {
    id: `${dto.id}__submit`,
    type: 'button',
    x: 0,
    y: 0,
    w: contentWidth,
    h: 44,
    props: { label: dto.props.submitLabel, variant: 'solid' },
  };
  return {
    id: dto.id,
    ...editor,
    type: 'column',
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
    props: {
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      gap: 12,
      padding: 16,
    },
    children: [title, ...fields, submit],
  };
}

interface LegacyFormMigration {
  behavior: Behavior;
  graph: LogicGraph;
}

function collectLegacyFormMigrations(nodes: readonly ComponentNodeDTO[]): LegacyFormMigration[] {
  const migrations: LegacyFormMigration[] = [];
  for (const node of nodes) {
    if (node.type === 'form' && node.props.dataBinding) {
      const triggerId = `${node.id}__submit_trigger`;
      const actionId = `${node.id}__submit_action`;
      const graphId = `${node.id}__submit_graph`;
      const submitId = `${node.id}__submit`;
      const inputMappings: ActionInputMappings = {};
      const values: Record<string, string> = {};
      for (const binding of node.props.dataBinding.fields) {
        if (!binding.dataFieldId) continue;
        values[binding.dataFieldId] = '';
        inputMappings[binding.dataFieldId] = {
          source: 'component',
          nodeId: `${node.id}__field_${binding.formFieldIndex}`,
          property: 'value',
        };
      }
      migrations.push({
        behavior: {
          id: `${node.id}__submit_behavior`,
          name: `Submit ${node.props.title}`,
          event: 'click',
          graphId,
          targetNodeId: submitId,
        },
        graph: {
          id: graphId,
          name: `Submit ${node.props.title}`,
          sourceNodeId: submitId,
          nodes: [
            { kind: 'trigger', id: triggerId, event: 'click', position: { x: 80, y: 160 } },
            {
              kind: 'action',
              id: actionId,
              position: { x: 312, y: 160 },
              payload: {
                type: 'insert-record',
                collectionId: node.props.dataBinding.collectionId,
                values,
              },
              inputMappings,
            },
          ],
          edges: [{
            id: `${node.id}__submit_edge`,
            fromNodeId: triggerId,
            fromPort: 'next',
            toNodeId: actionId,
            toPort: 'in',
          }],
        },
      });
    }
    if (node.type === 'container' || node.type === 'column' || node.type === 'row' || node.type === 'listview') {
      migrations.push(...collectLegacyFormMigrations(node.children));
    }
  }
  return migrations;
}

function mapNodeEditorToDto(
  node: ComponentNode,
): Partial<Pick<ComponentNodeDTO, 'name' | 'isHidden' | 'isLocked' | 'appearance' | 'responsive' | 'bindings'>> {
  return compactEditorMetadata(node.name, node.isHidden, node.isLocked, node.appearance, node.responsive, node.bindings);
}

function mapNodeEditorFromDto(
  dto: ComponentNodeDTO,
): Partial<Pick<ComponentNode, 'name' | 'isHidden' | 'isLocked' | 'appearance' | 'responsive' | 'bindings'>> {
  return compactEditorMetadata(dto.name, dto.isHidden, dto.isLocked, dto.appearance, dto.responsive, dto.bindings);
}

function compactEditorMetadata(
  name: string | undefined,
  isHidden: boolean | undefined,
  isLocked: boolean | undefined,
  appearance: ComponentNode['appearance'],
  responsive: ComponentNode['responsive'],
  bindings: ComponentNode['bindings'],
): { name?: string; isHidden?: boolean; isLocked?: boolean; appearance?: ComponentNode['appearance']; responsive?: ComponentNode['responsive']; bindings?: ComponentNode['bindings'] } {
  return {
    ...(name !== undefined ? { name } : {}),
    ...(isHidden !== undefined ? { isHidden } : {}),
    ...(isLocked !== undefined ? { isLocked } : {}),
    ...(appearance !== undefined ? { appearance: structuredClone(appearance) } : {}),
    ...(responsive !== undefined ? { responsive: structuredClone(responsive) } : {}),
    ...(bindings !== undefined ? { bindings: structuredClone(bindings) } : {}),
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
    ...(graph.purpose ? { purpose: graph.purpose } : {}),
    nodes: graph.nodes.map(mapLogicNodeToDto),
    edges: graph.edges.map(mapEdgeToDto),
  };
}

function mapLogicGraphFromDto(dto: LogicGraphDTO): LogicGraph {
  const migratedDto = migrateLegacyRagGraphDto(dto);
  const graph: LogicGraph = {
    id: migratedDto.id,
    name: migratedDto.name,
    sourceNodeId: migratedDto.sourceNodeId,
    ...(migratedDto.purpose ? { purpose: migratedDto.purpose } : {}),
    nodes: migratedDto.nodes.map((node, index) => mapLogicNodeFromDto(node, index)),
    edges: migratedDto.edges.map((edge, index) => mapEdgeFromDto(edge, migratedDto.id, index)),
  };
  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  return normalizeLogicGraph(graph, trigger?.event ?? 'click');
}

function mapLogicNodeToDto(node: LogicNode): LogicNodeDTO {
  return structuredClone(node);
}

function mapLogicNodeFromDto(dto: LogicNodeDTO, index: number): LogicNode {
  const position = dto.position ?? { x: 80 + index * 232, y: 160 };
  return { ...structuredClone(dto), position } as unknown as LogicNode;
}

function migrateLegacyRagGraphDto(dto: LogicGraphDTO): LogicGraphDTO {
  const replacements = new Map<string, { firstId: string; lastId: string }>();
  const nodes: LogicNodeDTO[] = [];
  const internalEdges: LogicEdgeDTO[] = [];
  let inferredPurpose = dto.purpose;

  for (const node of dto.nodes) {
    if (node.kind !== 'action' || !isLegacyRagType(node.payload.type)) {
      nodes.push(node);
      continue;
    }
    const base = node.position ?? { x: 312, y: 160 };
    const chain = legacyRagReplacementNodes(node, base);
    nodes.push(...chain);
    replacements.set(node.id, { firstId: chain[0]!.id, lastId: chain.at(-1)!.id });
    inferredPurpose = node.payload.type === 'rag-query' ? 'chat' : inferredPurpose ?? 'ingestion';
    for (let index = 0; index < chain.length - 1; index += 1) {
      const current = chain[index]!;
      const next = chain[index + 1]!;
      internalEdges.push({
        id: `edge_${node.id}_migration_${index + 1}`,
        fromNodeId: current.id,
        fromPort: migratedOutputPort(current),
        toNodeId: next.id,
        toPort: 'in',
      });
    }
  }

  if (replacements.size === 0) return dto;
  const edges = dto.edges.map((edge) => ({
    ...edge,
    fromNodeId: replacements.get(edge.fromNodeId)?.lastId ?? edge.fromNodeId,
    toNodeId: replacements.get(edge.toNodeId)?.firstId ?? edge.toNodeId,
  }));
  return { ...dto, purpose: inferredPurpose, nodes, edges: [...edges, ...internalEdges] };
}

function isLegacyRagType(type: string): type is 'rag-index' | 'rag-query' | 'rag-remove' {
  return type === 'rag-index' || type === 'rag-query' || type === 'rag-remove';
}

function legacyRagReplacementNodes(
  node: Extract<LogicNodeDTO, { kind: 'action' }>,
  base: { x: number; y: number },
): Array<Extract<LogicNodeDTO, { kind: 'action' }>> {
  const position = (offset: number) => ({ x: base.x + offset * 232, y: base.y });
  if (node.payload.type === 'rag-index') {
    const splitId = `${node.id}__split`;
    const embeddingId = `${node.id}__embedding`;
    return [
      { kind: 'action', id: node.id, position: position(0), payload: { type: 'document-load', source: 'inline', sourceReference: '', documentId: node.payload.documentId, title: node.payload.title, text: node.payload.content, metadata: {} }, inputMappings: node.inputMappings },
      { kind: 'action', id: splitId, position: position(1), payload: { type: 'text-split', strategy: 'recursive-character', chunkSize: 700, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' '] }, inputMappings: { documents: { source: 'node-output', nodeId: node.id, path: 'documents' } } },
      { kind: 'action', id: embeddingId, position: position(2), payload: { type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 }, inputMappings: { chunks: { source: 'node-output', nodeId: splitId, path: 'chunks' } } },
      { kind: 'action', id: `${node.id}__upsert`, position: position(3), payload: { type: 'vector-upsert', connectionProfileId: node.payload.knowledgeBaseId ?? '', indexName: node.payload.knowledgeBaseId ?? '', namespace: '', conflictMode: 'upsert' }, inputMappings: { chunks: { source: 'node-output', nodeId: splitId, path: 'chunks' }, embeddings: { source: 'node-output', nodeId: embeddingId, path: 'embeddings' } } },
    ];
  }
  if (node.payload.type === 'rag-query') {
    const queryEmbeddingId = `${node.id}__query_embedding`;
    const retrieverId = `${node.id}__retriever`;
    const promptId = `${node.id}__prompt`;
    return [
      { kind: 'action', id: node.id, position: position(0), payload: { type: 'chat-input', componentId: '', staticQuestion: node.payload.query }, inputMappings: node.inputMappings?.query ? { question: node.inputMappings.query } : undefined },
      { kind: 'action', id: queryEmbeddingId, position: position(1), payload: { type: 'query-embedding', connectionProfileId: '', model: '' }, inputMappings: { question: { source: 'node-output', nodeId: node.id, path: 'question' } } },
      { kind: 'action', id: retrieverId, position: position(2), payload: { type: 'vector-retrieve', connectionProfileId: node.payload.knowledgeBaseId ?? '', indexName: node.payload.knowledgeBaseId ?? '', namespace: '', topK: node.payload.topK ?? 5, minimumScore: 0, metadataFilter: {} }, inputMappings: { question: { source: 'node-output', nodeId: node.id, path: 'question' }, queryEmbedding: { source: 'node-output', nodeId: queryEmbeddingId, path: 'embeddingReference' } } },
      { kind: 'action', id: promptId, position: position(3), payload: { type: 'prompt-template', template: 'Answer the question using only the supplied context.\n\nContext:\n{context}\n\nQuestion:\n{question}', contextSeparator: '\n\n---\n\n', emptyContextBehavior: 'return-empty' }, inputMappings: { question: { source: 'node-output', nodeId: node.id, path: 'question' }, matches: { source: 'node-output', nodeId: retrieverId, path: 'matches' } } },
      { kind: 'action', id: `${node.id}__llm`, position: position(4), payload: { type: 'llm-generate', connectionProfileId: '', model: '', systemPrompt: '', temperature: 0.2, maxTokens: 800 }, inputMappings: { prompt: { source: 'node-output', nodeId: promptId, path: 'prompt' }, matches: { source: 'node-output', nodeId: retrieverId, path: 'matches' } } },
    ];
  }
  if (node.payload.type === 'rag-remove') {
    return [{ kind: 'action', id: node.id, position: position(0), payload: { type: 'vector-delete', connectionProfileId: node.payload.knowledgeBaseId ?? '', indexName: node.payload.knowledgeBaseId ?? '', namespace: '', documentId: node.payload.documentId }, inputMappings: node.inputMappings }];
  }
  throw new Error(`Unsupported legacy RAG payload in node ${node.id}.`);
}

function migratedOutputPort(node: Extract<LogicNodeDTO, { kind: 'action' }>): 'next' | 'success' {
  return node.payload.type === 'text-split' || node.payload.type === 'chat-input' || node.payload.type === 'prompt-template'
    ? 'next'
    : 'success';
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
    ...(dto.kind || (dto.toPort && dto.toPort !== 'in')
      ? { kind: dto.kind ?? 'resource' as const }
      : {}),
  };
}
