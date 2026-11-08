import type { DataCollection, DataFieldType, DataValue } from '../entities/appData';
import { isChildBearingNode, type ComponentBindingTarget, type ComponentNode, type ListViewNode } from '../entities/componentNode';
import { isBindingTargetAllowed, isFieldTypeCompatible } from '../bindings/componentBindings';
import type { ActionPayload, LogicGraph, ValueExpression } from '../entities/logic';
import { outputPortsFor, resourceInputPortsFor, resourceOutputPortsFor } from '../logic/graph';
import type { ProjectDocument, Screen } from '../entities/screen';

export type ValidationSeverity = 'error' | 'warning';
export type ValidationArea = 'screen' | 'component' | 'logic' | 'data' | 'deployment';

export interface ValidationIssue {
  id: string;
  code: string;
  severity: ValidationSeverity;
  area: ValidationArea;
  message: string;
  screenId?: string;
  componentId?: string;
  behaviorId?: string;
  graphId?: string;
  logicNodeId?: string;
  collectionId?: string;
  fieldId?: string;
  bindingTarget?: ComponentBindingTarget;
}

export interface ValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
}

export function validateProject(
  document: ProjectDocument,
  collections: readonly DataCollection[] = [],
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const screens = document.screens;
  const componentIds = new Set<string>();
  const screenIds = new Set(screens.map((screen) => screen.id));
  const screenPaths = new Set<string>();
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));

  if (screens.length === 0) {
    issues.push(issue('project-no-screens', 'error', 'screen', 'Project needs at least one screen.'));
  }

  for (const screen of screens) {
    if (screens.filter((candidate) => candidate.id === screen.id).length > 1) {
      issues.push(issue('screen-duplicate-id', 'error', 'screen', `Screen id “${screen.id}” is duplicated.`, { screenId: screen.id }));
    }
    if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(screen.path)) {
      issues.push(issue('screen-path-invalid', 'error', 'screen', `Screen path “${screen.path}” is invalid.`, { screenId: screen.id }));
    } else if (screenPaths.has(screen.path)) {
      issues.push(issue('screen-path-duplicate', 'error', 'screen', `Screen path “${screen.path}” is duplicated.`, { screenId: screen.id }));
    }
    screenPaths.add(screen.path);
    validateScreenTree(screen, componentIds, issues, screen.id, collectionById);
    validateLogic(screen, issues, collectionById, screenIds);
  }

  for (const collection of collections) {
    if (!collection.name.trim()) {
      issues.push(issue('data-collection-name', 'error', 'data', 'Collection name is required.', { collectionId: collection.id }));
    }
    const keys = new Set<string>();
    for (const field of collection.fields) {
      if (keys.has(field.key)) {
        issues.push(issue('data-field-duplicate-key', 'error', 'data', `Field key “${field.key}” is duplicated.`, { collectionId: collection.id, fieldId: field.id }));
      }
      keys.add(field.key);
      if (!field.key.trim()) {
        issues.push(issue('data-field-key', 'error', 'data', 'Field key is required.', { collectionId: collection.id, fieldId: field.id }));
      }
      if (!field.label.trim()) {
        issues.push(issue('data-field-label', 'warning', 'data', 'Field label is empty.', { collectionId: collection.id, fieldId: field.id }));
      }
    }
  }

  return { isValid: issues.every((entry) => entry.severity !== 'error'), issues };
}

function validateScreenTree(
  screen: Screen,
  componentIds: Set<string>,
  issues: ValidationIssue[],
  screenId: string,
  collections: ReadonlyMap<string, DataCollection>,
): void {
  function visit(nodes: readonly ComponentNode[], parent?: ComponentNode, itemSource?: ListViewNode): void {
    for (const node of nodes) {
      if (componentIds.has(node.id)) {
        issues.push(issue('component-duplicate-id', 'error', 'component', `Component id “${node.id}” is duplicated.`, { screenId, componentId: node.id }));
      }
      componentIds.add(node.id);
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.w) || !Number.isFinite(node.h)) {
        issues.push(issue('component-geometry-invalid', 'error', 'component', 'Component geometry is invalid.', { screenId, componentId: node.id }));
      }
      if (node.w <= 0 || node.h <= 0) {
        issues.push(issue('component-size-invalid', 'error', 'component', 'Component width and height must be positive.', { screenId, componentId: node.id }));
      }
      if (node.responsive) {
        for (const [breakpoint, override] of Object.entries(node.responsive)) {
          if (!override) continue;
          const fields = ['x', 'y', 'w', 'h'] as const;
          if (fields.some((field) => override[field] !== undefined && !Number.isFinite(override[field]))) {
            issues.push(issue('component-responsive-geometry-invalid', 'error', 'component', `Component ${breakpoint} responsive geometry is invalid.`, { screenId, componentId: node.id }));
          }
          if ((override.w !== undefined && override.w <= 0) || (override.h !== undefined && override.h <= 0)) {
            issues.push(issue('component-responsive-size-invalid', 'error', 'component', `Component ${breakpoint} responsive size must be positive.`, { screenId, componentId: node.id }));
          }
          if (override.isHidden !== undefined && typeof override.isHidden !== 'boolean') {
            issues.push(issue('component-responsive-visibility-invalid', 'error', 'component', `Component ${breakpoint} responsive visibility is invalid.`, { screenId, componentId: node.id }));
          }
        }
      }
      if (parent?.type === 'container' && (node.x < 0 || node.y < 0 || node.x + node.w > parent.w || node.y + node.h > parent.h)) {
        issues.push(issue('component-outside-frame', 'warning', 'component', 'Component extends outside its parent frame.', { screenId, componentId: node.id }));
      }
      validateComponentProps(node, screenId, collections, issues, itemSource);
      if (isChildBearingNode(node)) {
        visit(node.children, node, node.type === 'listview' ? node : itemSource);
      }
    }
  }
  visit(screen.nodes);
}

function validateComponentProps(
  node: ComponentNode,
  screenId: string,
  collections: ReadonlyMap<string, DataCollection>,
  issues: ValidationIssue[],
  itemSource?: ListViewNode,
): void {
  const base = { screenId, componentId: node.id };
  validateComponentBindings(node, itemSource, screenId, collections, issues);
  switch (node.type) {
    case 'button':
      if (!node.props.label.trim()) issues.push(issue('component-label', 'warning', 'component', 'Button label is empty.', base));
      break;
    case 'text':
      if (!node.props.text.trim()) issues.push(issue('component-label', 'warning', 'component', 'Text content is empty.', base));
      break;
    case 'input':
      if (!node.props.label.trim()) issues.push(issue('component-label', 'warning', 'component', 'Input label is empty.', base));
      break;
    case 'image':
      if (node.props.src && !node.props.alt.trim()) issues.push(issue('component-alt', 'warning', 'component', 'Image should have alt text.', base));
      break;
    case 'column':
    case 'row':
      if (node.props.gap < 0 || node.props.padding < 0) {
        issues.push(issue('component-layout-spacing', 'error', 'component', 'Layout gap and padding cannot be negative.', base));
      }
      break;
    case 'listview':
      if (
        node.props.gap < 0
        || node.props.padding < 0
        || node.props.itemSpacing < 0
        || node.props.itemBorderRadius < 0
      ) {
        issues.push(issue('component-layout-spacing', 'error', 'component', 'ListView item layout values cannot be negative.', base));
      }
      if (node.props.dataSource.kind === 'collection') {
        const collection = collections.get(node.props.dataSource.collectionId);
        if (!collection) {
          issues.push(issue('data-missing-collection', 'error', 'data', 'ListView references a missing collection.', base));
        } else {
          for (const fieldId of node.props.dataSource.displayFieldIds) {
            if (fieldId && !collection.fields.some((field) => field.id === fieldId)) {
              issues.push(issue('data-missing-field', 'error', 'data', 'ListView references a missing display field.', base));
            }
          }
        }
      } else {
        validateStaticListSource(node, screenId, issues);
      }
      if (node.children.length === 0) issues.push(issue('component-list-template-empty', 'warning', 'component', 'ListView item template is empty.', base));
      break;
    case 'checkbox':
    case 'switch':
      if (!node.props.label.trim()) issues.push(issue('component-label', 'warning', 'component', 'Control label is empty.', base));
      break;
    case 'radio':
    case 'dropdown':
      if (!node.props.label.trim()) issues.push(issue('component-label', 'warning', 'component', 'Control label is empty.', base));
      if (node.props.options.length === 0) issues.push(issue('component-options', 'error', 'component', 'Control needs at least one option.', base));
      if (node.props.selectedIndex >= node.props.options.length || node.props.selectedIndex < -1) issues.push(issue('component-selection', 'warning', 'component', 'Selected option index is out of range.', base));
      break;
    case 'slider':
      if (!node.props.label.trim()) issues.push(issue('component-label', 'warning', 'component', 'Slider label is empty.', base));
      if (node.props.min >= node.props.max) issues.push(issue('component-range', 'error', 'component', 'Slider minimum must be less than maximum.', base));
      if (node.props.step <= 0) issues.push(issue('component-range', 'error', 'component', 'Slider step must be positive.', base));
      if (node.props.value < node.props.min || node.props.value > node.props.max) issues.push(issue('component-range', 'warning', 'component', 'Slider value is outside its range.', base));
      break;
    case 'progress':
      if (node.props.value < 0 || node.props.value > 100) issues.push(issue('component-range', 'warning', 'component', 'Progress value should be between 0 and 100.', base));
      break;
    case 'divider':
      if (node.props.thickness <= 0) issues.push(issue('component-size-invalid', 'error', 'component', 'Divider thickness must be positive.', base));
      break;
    default:
      break;
  }
}

function validateComponentBindings(
  node: ComponentNode,
  itemSource: ListViewNode | undefined,
  screenId: string,
  collections: ReadonlyMap<string, DataCollection>,
  issues: ValidationIssue[],
): void {
  const seen = new Set<ComponentBindingTarget>();
  for (const binding of node.bindings ?? []) {
    const base = {
      screenId,
      componentId: node.id,
      fieldId: binding.value.fieldId,
      bindingTarget: binding.target,
    };
    if (seen.has(binding.target)) {
      issues.push(issue('component-binding-duplicate', 'error', 'component', 'Component property has more than one item binding.', base));
    }
    seen.add(binding.target);
    if (!isBindingTargetAllowed(node.type, binding.target)) {
      issues.push(issue('component-binding-target', 'error', 'component', 'Binding target is not supported by this component.', base));
    }
    if (!itemSource) {
      issues.push(issue('component-binding-context', 'error', 'component', 'Item binding must be inside a ListView item template.', base));
      continue;
    }
    const field = itemSource.props.dataSource.kind === 'static'
      ? itemSource.props.dataSource.fields.find((candidate) => candidate.id === binding.value.fieldId)
      : collections.get(itemSource.props.dataSource.collectionId)?.fields.find((candidate) => candidate.id === binding.value.fieldId);
    if (!field) {
      issues.push(issue('component-binding-field', 'error', 'data', 'Item binding references a missing field.', base));
    } else if (!isFieldTypeCompatible(binding.target, field.type)) {
      issues.push(issue('component-binding-type', 'error', 'data', 'Item field type is incompatible with the bound property.', base));
    }
  }
}

function validateStaticListSource(
  node: ListViewNode,
  screenId: string,
  issues: ValidationIssue[],
): void {
  if (node.props.dataSource.kind !== 'static') return;
  const fieldIds = new Set<string>();
  for (const field of node.props.dataSource.fields) {
    const base = { screenId, componentId: node.id, fieldId: field.id };
    if (!field.id.trim()) issues.push(issue('data-static-field-id', 'error', 'data', 'Static item field ID is required.', base));
    if (fieldIds.has(field.id)) issues.push(issue('data-static-field-duplicate', 'error', 'data', 'Static item field ID is duplicated.', base));
    fieldIds.add(field.id);
  }
  const itemIds = new Set<string>();
  for (const item of node.props.dataSource.items) {
    if (!item.id.trim()) issues.push(issue('data-static-item-id', 'error', 'data', 'Static item ID is required.', { screenId, componentId: node.id }));
    if (itemIds.has(item.id)) issues.push(issue('data-static-item-duplicate', 'error', 'data', 'Static item ID is duplicated.', { screenId, componentId: node.id }));
    itemIds.add(item.id);
    for (const field of node.props.dataSource.fields) {
      const value = item.values[field.id];
      if (value !== undefined && !matchesDataFieldType(value, field.type)) {
        issues.push(issue('data-static-item-type', 'error', 'data', 'Static item value does not match its field type.', {
          screenId,
          componentId: node.id,
          fieldId: field.id,
        }));
      }
    }
  }
}

function matchesDataFieldType(value: DataValue, type: DataFieldType): boolean {
  if (value === null) return true;
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string';
}

function validateLogic(
  screen: Screen,
  issues: ValidationIssue[],
  collections: ReadonlyMap<string, DataCollection>,
  screenIds: Set<string>,
): void {
  const componentIds = new Set(screen.nodes.flatMap((node) => flattenNodeIds(node)));
  const graphIds = new Set(screen.logicGraphs.map((graph) => graph.id));
  for (const behavior of screen.behaviors) {
    if (!componentIds.has(behavior.targetNodeId)) {
      issues.push(issue('logic-missing-target', 'error', 'logic', 'Behavior target component is missing.', { screenId: screen.id, behaviorId: behavior.id }));
    }
    if (!graphIds.has(behavior.graphId)) {
      issues.push(issue('logic-missing-graph', 'error', 'logic', 'Behavior graph is missing.', { screenId: screen.id, behaviorId: behavior.id }));
    }
  }
  for (const graph of screen.logicGraphs) {
    const graphItemSource = findNearestListView(screen.nodes, graph.sourceNodeId);
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const triggerCount = graph.nodes.filter((node) => node.kind === 'trigger').length;
    if (triggerCount !== 1) {
      issues.push(issue('logic-trigger-count', 'error', 'logic', 'Each workflow must have exactly one trigger.', { screenId: screen.id, graphId: graph.id }));
    }
    const incomingCounts = new Map<string, number>();
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
        issues.push(issue('logic-missing-edge-node', 'error', 'logic', 'Workflow connection references a missing node.', { screenId: screen.id, graphId: graph.id }));
        continue;
      }
      if (edge.fromNodeId === edge.toNodeId) {
        issues.push(issue('logic-self-loop', 'error', 'logic', 'Workflow cannot connect a node to itself.', { screenId: screen.id, graphId: graph.id }));
      }
      const source = graph.nodes.find((node) => node.id === edge.fromNodeId);
      const target = graph.nodes.find((node) => node.id === edge.toNodeId);
      const isResource = edge.kind === 'resource' || edge.toPort !== 'in';
      if (source && isResource && !resourceOutputPortsFor(source).includes(edge.fromPort as import('../entities/logic').LogicResourcePort)) {
        issues.push(issue('logic-invalid-resource-output', 'error', 'logic', 'Workflow resource connection uses an invalid output port.', { screenId: screen.id, graphId: graph.id }));
      } else if (source && !isResource && !outputPortsFor(source).includes(edge.fromPort)) {
        issues.push(issue('logic-invalid-output-port', 'error', 'logic', 'Workflow connection uses an invalid output port.', { screenId: screen.id, graphId: graph.id }));
      }
      if (target && isResource && !resourceInputPortsFor(target).includes(edge.toPort as import('../entities/logic').LogicResourcePort)) {
        issues.push(issue('logic-invalid-resource-input', 'error', 'logic', 'Workflow resource connection uses an invalid input port.', { screenId: screen.id, graphId: graph.id }));
      }
      if (!isResource) incomingCounts.set(edge.toNodeId, (incomingCounts.get(edge.toNodeId) ?? 0) + 1);
    }
    if (wouldCreateCycle(graph)) {
      issues.push(issue('logic-cycle', 'error', 'logic', 'Workflow contains a cycle.', { screenId: screen.id, graphId: graph.id }));
    }
    for (const [nodeId, count] of incomingCounts) {
      if (count > 1) {
        issues.push(issue('logic-multiple-incoming', 'error', 'logic', 'Workflow node has multiple incoming connections.', { screenId: screen.id, graphId: graph.id, logicNodeId: nodeId }));
      }
    }
    for (const node of graph.nodes) {
      if (node.kind === 'trigger') {
        if (!screen.behaviors.some((behavior) => behavior.graphId === graph.id && behavior.event === node.event)) {
          issues.push(issue('logic-trigger-binding', 'warning', 'logic', 'Workflow trigger is not bound to a component event.', { screenId: screen.id, graphId: graph.id, logicNodeId: node.id }));
        }
      }
      if (node.kind === 'action') {
        validateActionPayload(node.payload, screen, collections, issues, screen.id, graph.id, node.id, screenIds);
        const localListTarget = node.payload.type === 'add-local-list-item'
          ? findComponentNode(screen.nodes, node.payload.targetNodeId)
          : null;
        for (const expression of Object.values(node.inputMappings ?? {})) {
          if (expression.source === 'component' && !componentIds.has(expression.nodeId)) {
            issues.push(issue('logic-missing-input-source', 'error', 'logic', 'Action input references a missing component.', { screenId: screen.id, graphId: graph.id, logicNodeId: node.id }));
          }
          if (expression.source === 'node-output' && !nodeIds.has(expression.nodeId)) {
            issues.push(issue('logic-missing-input-source', 'error', 'logic', 'Action input references a missing workflow node.', { screenId: screen.id, graphId: graph.id, logicNodeId: node.id }));
          }
          validateListItemExpression(expression, graphItemSource, collections, issues, {
            screenId: screen.id,
            graphId: graph.id,
            logicNodeId: node.id,
          });
        }
        if (node.payload.type === 'add-local-list-item' && localListTarget?.type === 'listview' && localListTarget.props.dataSource.kind === 'static') {
          const fieldIds = new Set(localListTarget.props.dataSource.fields.map((field) => field.id));
          for (const key of Object.keys(node.inputMappings ?? {})) {
            if (!fieldIds.has(key)) {
              issues.push(issue('logic-local-list-field', 'error', 'logic', 'Add Local List Item maps a missing static field.', {
                screenId: screen.id,
                graphId: graph.id,
                logicNodeId: node.id,
                componentId: localListTarget.id,
                fieldId: key,
              }));
            }
          }
        }
      }
      if (node.kind === 'condition') {
        if (node.left.source === 'component' && !componentIds.has(node.left.nodeId)) {
          issues.push(issue('logic-missing-condition-source', 'error', 'logic', 'Condition source component is missing.', { screenId: screen.id, graphId: graph.id, logicNodeId: node.id }));
        }
        if (node.left.source === 'node-output' && !nodeIds.has(node.left.nodeId)) {
          issues.push(issue('logic-missing-condition-source', 'error', 'logic', 'Condition source node is missing.', { screenId: screen.id, graphId: graph.id, logicNodeId: node.id }));
        }
        validateListItemExpression(node.left, graphItemSource, collections, issues, {
          screenId: screen.id,
          graphId: graph.id,
          logicNodeId: node.id,
        });
      }
    }
    validateRequiredResources(graph, screen.id, issues);
  }
}

function validateListItemExpression(
  expression: ValueExpression,
  itemSource: ListViewNode | null,
  collections: ReadonlyMap<string, DataCollection>,
  issues: ValidationIssue[],
  context: Pick<ValidationIssue, 'screenId' | 'graphId' | 'logicNodeId'>,
): void {
  if (expression.source !== 'list-item') return;
  if (!itemSource) {
    issues.push(issue('logic-list-item-context', 'error', 'logic', 'Current-item input requires a component inside a ListView template.', context));
    return;
  }
  const exists = itemSource.props.dataSource.kind === 'static'
    ? itemSource.props.dataSource.fields.some((field) => field.id === expression.fieldId)
    : collections.get(itemSource.props.dataSource.collectionId)?.fields.some((field) => field.id === expression.fieldId) === true;
  if (!exists) {
    issues.push(issue('logic-list-item-field', 'error', 'logic', 'Current-item input references a missing field.', {
      ...context,
      componentId: itemSource.id,
      fieldId: expression.fieldId,
    }));
  }
}

function findNearestListView(
  nodes: readonly ComponentNode[],
  targetId: string,
  nearest: ListViewNode | null = null,
): ListViewNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return nearest;
    if (!isChildBearingNode(node)) continue;
    const result = findNearestListView(node.children, targetId, node.type === 'listview' ? node : nearest);
    if (result) return result;
  }
  return null;
}

function validateRequiredResources(graph: LogicGraph, screenId: string, issues: ValidationIssue[]): void {
  const hasResource = (nodeId: string, port: import('../entities/logic').LogicResourcePort): boolean =>
    graph.edges.some((edge) =>
      (edge.kind === 'resource' || edge.toPort !== 'in') && edge.toNodeId === nodeId && edge.toPort === port);
  for (const node of graph.nodes) {
    if (node.kind !== 'action') continue;
    if (node.payload.type === 'ai-agent' && !hasResource(node.id, 'chat-model')) {
      issues.push(issue('logic-missing-agent-model', 'error', 'logic', 'AI Agent requires an attached Chat Model.', { screenId, graphId: graph.id, logicNodeId: node.id }));
    }
    if (node.payload.type === 'vector-store' && node.payload.operation === 'upsert') {
      if (node.payload.documentInputMode === 'document-loader' && !hasResource(node.id, 'documents')) {
        issues.push(issue('logic-missing-document-loader', 'error', 'logic', 'Vector Store Upsert requires an attached Document Loader.', { screenId, graphId: graph.id, logicNodeId: node.id }));
      }
      if (!hasResource(node.id, 'embeddings')) {
        issues.push(issue('logic-missing-embedding-model', 'error', 'logic', 'Vector Store Upsert requires an attached Embedding Model.', { screenId, graphId: graph.id, logicNodeId: node.id }));
      }
    }
    if (node.payload.type === 'vector-store' && node.payload.operation === 'retrieve-tool' && !hasResource(node.id, 'embeddings')) {
      issues.push(issue('logic-missing-embedding-model', 'error', 'logic', 'Vector Store Tool requires an attached Embedding Model.', { screenId, graphId: graph.id, logicNodeId: node.id }));
    }
  }
}

function validateActionPayload(
  payload: ActionPayload,
  screen: Screen,
  collections: ReadonlyMap<string, DataCollection>,
  issues: ValidationIssue[],
  screenId: string,
  graphId: string,
  logicNodeId: string,
  screenIds: Set<string>,
): void {
  const base = { screenId, graphId, logicNodeId };
  switch (payload.type) {
    case 'change-text':
      if (!payload.targetNodeId) issues.push(issue('logic-empty-target', 'warning', 'logic', 'Change Text target is not set.', base));
      else if (!screen.nodes.flatMap(flattenNodeIds).includes(payload.targetNodeId)) issues.push(issue('logic-missing-target', 'error', 'logic', 'Change Text target component is missing.', base));
      break;
    case 'show-message':
      if (!payload.message.trim()) issues.push(issue('logic-empty-message', 'warning', 'logic', 'Show Message text is empty.', base));
      break;
    case 'navigate':
      if (!payload.targetScreenId) issues.push(issue('logic-empty-screen', 'warning', 'logic', 'Navigate target screen is not set.', base));
      else if (!screenIds.has(payload.targetScreenId)) issues.push(issue('logic-missing-screen', 'error', 'logic', 'Navigate target screen is missing.', base));
      break;
    case 'get-records':
      break;
    case 'get-record':
      if (!payload.recordId) issues.push(issue('logic-empty-record', 'warning', 'logic', 'Record ID is not set.', base));
      break;
    case 'insert-record':
    case 'update-record':
    case 'delete-record':
      if (!payload.collectionId || !collections.has(payload.collectionId)) {
        issues.push(issue('data-missing-collection', 'error', 'logic', 'Database node references a missing collection.', base));
      }
      if (payload.type === 'update-record' || payload.type === 'delete-record') {
        if (!payload.recordId) issues.push(issue('logic-empty-record', 'warning', 'logic', 'Record ID is not set.', base));
      }
      break;
    case 'refresh-collection':
      if (!payload.collectionId || !collections.has(payload.collectionId)) {
        issues.push(issue('data-missing-collection', 'error', 'logic', 'Refresh Collection references a missing collection.', base));
      }
      break;
    case 'send-email':
      if (!payload.to.trim()) issues.push(issue('logic-empty-email', 'warning', 'logic', 'Send Email recipient is empty.', base));
      if (!payload.subject.trim()) issues.push(issue('logic-empty-email-subject', 'warning', 'logic', 'Send Email subject is empty.', base));
      break;
    case 'set-variable':
      if (!payload.name.trim()) issues.push(issue('logic-empty-variable', 'warning', 'logic', 'Variable name is empty.', base));
      break;
    case 'set-component-value':
      if (!payload.targetNodeId) issues.push(issue('logic-empty-target', 'warning', 'logic', 'Component target is not set.', base));
      else if (!screen.nodes.flatMap(flattenNodeIds).includes(payload.targetNodeId)) issues.push(issue('logic-missing-target', 'error', 'logic', 'Component target is missing.', base));
      break;
    case 'add-local-list-item': {
      if (!payload.targetNodeId) {
        issues.push(issue('logic-empty-target', 'warning', 'logic', 'Add Local List Item target is not set.', base));
        break;
      }
      const target = findComponentNode(screen.nodes, payload.targetNodeId);
      if (!target) {
        issues.push(issue('logic-missing-target', 'error', 'logic', 'Add Local List Item target is missing.', base));
        break;
      }
      if (target.type !== 'listview' || target.props.dataSource.kind !== 'static') {
        issues.push(issue('logic-local-list-target', 'error', 'logic', 'Add Local List Item requires a static ListView target.', {
          ...base,
          componentId: target.id,
        }));
        break;
      }
      const fields = new Map(target.props.dataSource.fields.map((field) => [field.id, field]));
      for (const [fieldId, value] of Object.entries(payload.values)) {
        const field = fields.get(fieldId);
        if (!field) {
          issues.push(issue('logic-local-list-field', 'error', 'logic', 'Add Local List Item references a missing static field.', {
            ...base,
            componentId: target.id,
            fieldId,
          }));
        } else if (!matchesDataFieldType(value, field.type)) {
          issues.push(issue('logic-local-list-value-type', 'error', 'logic', 'Add Local List Item value does not match its static field type.', {
            ...base,
            componentId: target.id,
            fieldId,
          }));
        }
      }
      break;
    }
    case 'document-load':
      if (payload.source === 'inline' && !payload.text.trim()) issues.push(issue('logic-empty-document', 'warning', 'logic', 'Inline document text is empty.', base));
      if ((payload.source === 'url' || payload.source === 'file-reference') && !payload.sourceReference.trim()) issues.push(issue('logic-empty-document-source', 'warning', 'logic', 'Document source reference is empty.', base));
      if (payload.source === 'collection' && (!payload.collectionId || !collections.has(payload.collectionId))) issues.push(issue('data-missing-collection', 'error', 'logic', 'Document Loader references a missing collection.', base));
      break;
    case 'text-split':
      if (payload.chunkSize <= 0) issues.push(issue('logic-invalid-chunk-size', 'error', 'logic', 'Chunk size must be positive.', base));
      if (payload.chunkOverlap < 0 || payload.chunkOverlap >= payload.chunkSize) issues.push(issue('logic-invalid-chunk-overlap', 'error', 'logic', 'Chunk overlap must be non-negative and smaller than chunk size.', base));
      break;
    case 'embedding-generate':
    case 'query-embedding':
      if (!payload.connectionProfileId.trim()) issues.push(issue('logic-missing-model-profile', 'error', 'logic', 'Embedding connection profile is required.', base));
      break;
    case 'vector-upsert':
    case 'vector-delete':
    case 'vector-retrieve':
      if (!payload.connectionProfileId.trim()) issues.push(issue('logic-missing-vector-profile', 'error', 'logic', 'Vector-store connection profile is required.', base));
      if (!payload.indexName.trim()) issues.push(issue('logic-missing-vector-index', 'error', 'logic', 'Vector-store index name is required.', base));
      if (payload.type === 'vector-delete' && !payload.documentId.trim()) issues.push(issue('logic-empty-document', 'warning', 'logic', 'Vector delete document ID is empty.', base));
      if (payload.type === 'vector-retrieve' && (payload.topK <= 0 || payload.minimumScore < 0 || payload.minimumScore > 1)) issues.push(issue('logic-invalid-retrieval-config', 'error', 'logic', 'Retriever top K must be positive and minimum score must be between 0 and 1.', base));
      break;
    case 'rerank':
      if (!payload.connectionProfileId.trim()) issues.push(issue('logic-missing-reranker-profile', 'error', 'logic', 'Reranker connection profile is required.', base));
      if (payload.topN <= 0 || payload.minimumScore < 0 || payload.minimumScore > 1) issues.push(issue('logic-invalid-reranker-config', 'error', 'logic', 'Reranker top N must be positive and minimum score must be between 0 and 1.', base));
      break;
    case 'prompt-template':
      if (!payload.template.includes('{context}') || !payload.template.includes('{question}')) issues.push(issue('logic-invalid-prompt-template', 'warning', 'logic', 'Prompt template should include {context} and {question}.', base));
      break;
    case 'llm-generate':
      if (!payload.connectionProfileId.trim()) issues.push(issue('logic-missing-llm-profile', 'error', 'logic', 'LLM connection profile is required.', base));
      if (payload.temperature < 0 || payload.temperature > 2 || payload.maxTokens <= 0) issues.push(issue('logic-invalid-llm-config', 'error', 'logic', 'LLM temperature must be between 0 and 2 and max tokens must be positive.', base));
      break;
    case 'chat-input':
      if (!payload.componentId && !payload.staticQuestion.trim()) issues.push(issue('logic-empty-chat-input', 'warning', 'logic', 'Chat Input needs a component or static question.', base));
      else if (payload.componentId && !screen.nodes.flatMap(flattenNodeIds).includes(payload.componentId)) issues.push(issue('logic-missing-target', 'error', 'logic', 'Chat Input component is missing.', base));
      break;
    case 'chat-output':
      if (!payload.targetNodeId) issues.push(issue('logic-empty-target', 'warning', 'logic', 'Chat Output target is not set.', base));
      else if (!screen.nodes.flatMap(flattenNodeIds).includes(payload.targetNodeId)) issues.push(issue('logic-missing-target', 'error', 'logic', 'Chat Output target is missing.', base));
      break;
    case 'memory':
      if (payload.windowSize <= 0) issues.push(issue('logic-invalid-memory-window', 'error', 'logic', 'Memory window size must be positive.', base));
      break;
    case 'vector-store':
      if (!payload.connectionProfileId.trim()) issues.push(issue('logic-missing-vector-profile', 'error', 'logic', 'Vector-store connection profile is required.', base));
      if (!payload.indexName.trim()) issues.push(issue('logic-missing-vector-index', 'error', 'logic', 'Vector-store index name is required.', base));
      if (payload.operation === 'retrieve-tool' && (payload.topK <= 0 || payload.minimumScore < 0 || payload.minimumScore > 1)) issues.push(issue('logic-invalid-retrieval-config', 'error', 'logic', 'Vector-store tool top K must be positive and minimum score must be between 0 and 1.', base));
      break;
    case 'chat-model':
      if (!payload.connectionProfileId.trim()) issues.push(issue('logic-missing-model-profile', 'error', 'logic', 'Chat-model connection profile is required.', base));
      if (payload.temperature < 0 || payload.temperature > 2 || payload.maxTokens <= 0) issues.push(issue('logic-invalid-llm-config', 'error', 'logic', 'Chat-model temperature must be between 0 and 2 and max tokens must be positive.', base));
      break;
    case 'ai-agent':
      if (!payload.instructions.trim()) issues.push(issue('logic-empty-agent-instructions', 'warning', 'logic', 'AI Agent instructions are empty.', base));
      if (payload.maxIterations <= 0) issues.push(issue('logic-invalid-agent-iterations', 'error', 'logic', 'AI Agent max iterations must be positive.', base));
      break;
    case 'cv-liveness':
    case 'cv-enroll':
    case 'cv-verify':
      if (!payload.mediaReference.trim()) issues.push(issue('logic-empty-media', 'warning', 'logic', 'Media reference is empty.', base));
      if (payload.type === 'cv-enroll' && !payload.consent) issues.push(issue('logic-missing-consent', 'warning', 'logic', 'Biometric consent is required.', base));
      if (payload.type === 'cv-enroll' && !payload.userId.trim()) issues.push(issue('logic-empty-user', 'warning', 'logic', 'User ID is required.', base));
      break;
    default: {
      const exhaustive: never = payload;
      void exhaustive;
    }
  }
}

function flattenNodeIds(node: ComponentNode): string[] {
  return isChildBearingNode(node) ? [node.id, ...node.children.flatMap(flattenNodeIds)] : [node.id];
}

function findComponentNode(nodes: readonly ComponentNode[], nodeId: string): ComponentNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (isChildBearingNode(node)) {
      const nested = findComponentNode(node.children, nodeId);
      if (nested) return nested;
    }
  }
  return null;
}

function wouldCreateCycle(graph: LogicGraph): boolean {
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
  }
  for (const node of graph.nodes) {
    const visited = new Set<string>();
    const stack = [node.id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === node.id && visited.has(current)) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...(outgoing.get(current) ?? []));
    }
  }
  return false;
}

let issueCounter = 0;
function issue(
  code: string,
  severity: ValidationSeverity,
  area: ValidationArea,
  message: string,
  context: Omit<ValidationIssue, 'id' | 'code' | 'severity' | 'area' | 'message'> = {},
): ValidationIssue {
  issueCounter += 1;
  return { id: `${code}-${issueCounter}`, code, severity, area, message, ...context };
}
