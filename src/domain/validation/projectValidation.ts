import type { DataCollection } from '../entities/appData';
import type { ComponentNode } from '../entities/componentNode';
import type { ActionPayload, LogicGraph } from '../entities/logic';
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
  const screenIds = new Set<string>();
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));

  if (screens.length === 0) {
    issues.push(issue('project-no-screens', 'error', 'screen', 'Project needs at least one screen.'));
  }

  for (const screen of screens) {
    if (screenIds.has(screen.id)) {
      issues.push(issue('screen-duplicate-id', 'error', 'screen', `Screen id “${screen.id}” is duplicated.`, { screenId: screen.id }));
    }
    screenIds.add(screen.id);
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
  function visit(nodes: readonly ComponentNode[], parent?: ComponentNode): void {
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
      if (parent?.type === 'container' && (node.x < 0 || node.y < 0 || node.x + node.w > parent.w || node.y + node.h > parent.h)) {
        issues.push(issue('component-outside-frame', 'warning', 'component', 'Component extends outside its parent frame.', { screenId, componentId: node.id }));
      }
      validateComponentProps(node, screenId, collections, issues);
      if (node.type === 'container') {
        visit(node.children, node);
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
): void {
  const base = { screenId, componentId: node.id };
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
    case 'list':
      if (node.props.dataSource?.kind === 'collection' && !collections.has(node.props.dataSource.collectionId)) {
        issues.push(issue('data-missing-collection', 'error', 'data', 'List references a missing collection.', base));
      }
      break;
    case 'form':
      if (!node.props.title.trim()) issues.push(issue('component-label', 'warning', 'component', 'Form title is empty.', base));
      if (node.props.dataBinding) {
        const collection = collections.get(node.props.dataBinding.collectionId);
        if (!collection) {
          issues.push(issue('data-missing-collection', 'error', 'data', 'Form references a missing collection.', base));
        } else {
          for (const binding of node.props.dataBinding.fields) {
            if (!collection.fields.some((field) => field.id === binding.dataFieldId)) {
              issues.push(issue('data-missing-field', 'error', 'data', 'Form field is mapped to a missing data field.', base));
            }
          }
        }
      }
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
      incomingCounts.set(edge.toNodeId, (incomingCounts.get(edge.toNodeId) ?? 0) + 1);
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
      }
      if (node.kind === 'condition') {
        if (!componentIds.has(node.left.nodeId)) {
          issues.push(issue('logic-missing-condition-source', 'error', 'logic', 'Condition source component is missing.', { screenId: screen.id, graphId: graph.id, logicNodeId: node.id }));
        }
      }
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
    default: {
      const exhaustive: never = payload;
      void exhaustive;
    }
  }
}

function flattenNodeIds(node: ComponentNode): string[] {
  return node.type === 'container' ? [node.id, ...node.children.flatMap(flattenNodeIds)] : [node.id];
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
