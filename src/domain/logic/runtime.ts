import type { ActionInputMappings, ActionPayload, LogicGraph, LogicOutputPort, TriggerEvent, ValueExpression } from '../entities/logic';
import type { ProjectDocument, Screen } from '../entities/screen';
import type { ComponentNode } from '../entities/componentNode';
import { removeLogicNodes } from './graph';
import { isAsyncActionPayload } from './graph';

/**
 * The published-app runtime: executes one behavior's chain and returns an
 * effect list for the caller to apply. Pure — the preview overlay writes
 * these effects into view state, which keeps the domain layer React-free.
 *
 * Click, change, and screen-load bindings use the same graph traversal.
 */
export type PreviewEffect =
  | { kind: 'change-text'; nodeId: string; text: string }
  | { kind: 'show-message'; message: string }
  | { kind: 'navigate'; screenId: string }
  | {
      kind: 'data-operation';
      payload: Extract<ActionPayload, { type: 'get-records' | 'insert-record' | 'update-record' | 'delete-record' }>;
    }
  | { kind: 'refresh-collection'; collectionId: string }
  | { kind: 'email-simulated'; to: string; subject: string };

export interface PreviewRuntimeContext {
  componentValues: ReadonlyMap<string, string>;
  session?: { user?: { id?: string; name?: string; email?: string } };
  nodeOutputs?: ReadonlyMap<string, unknown>;
}

const EMPTY_RUNTIME_CONTEXT: PreviewRuntimeContext = { componentValues: new Map() };
const MAX_RUNTIME_STEPS = 100;

export function runClickBehavior(
  document: ProjectDocument,
  screen: Screen,
  sourceNodeId: string,
  context: PreviewRuntimeContext = EMPTY_RUNTIME_CONTEXT,
): PreviewEffect[] {
  return runBehavior(document, screen, sourceNodeId, 'click', context);
}

export function runBehavior(
  document: ProjectDocument,
  screen: Screen,
  sourceNodeId: string,
  event: TriggerEvent,
  context: PreviewRuntimeContext = EMPTY_RUNTIME_CONTEXT,
): PreviewEffect[] {
  const behavior = screen.behaviors.find(
    (candidate) => candidate.event === event && candidate.targetNodeId === sourceNodeId,
  );
  if (!behavior) {
    return [];
  }
  const graph = screen.logicGraphs.find((candidate) => candidate.id === behavior.graphId);
  if (!graph) {
    return [];
  }

  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  if (!trigger) {
    return [];
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const effects: PreviewEffect[] = [];
  let currentId: string | undefined = trigger.id;
  let steps = 0;
  while (currentId && steps < MAX_RUNTIME_STEPS) {
    steps += 1;
    const node = byId.get(currentId);
    if (!node) {
      break;
    }
    let output: LogicOutputPort = 'next';
    if (node.kind === 'action') {
      const payload = applyActionInputMappings(node.payload, node.inputMappings, document, context);
      const effect = effectFor(payload, document);
      if (effect) {
        effects.push(effect);
      }
      output = isAsyncActionPayload(payload) ? 'success' : 'next';
    } else if (node.kind === 'condition') {
      output = evaluateCondition(node, document, context) ? 'true' : 'false';
    }
    currentId = graph.edges.find(
      (edge) => edge.fromNodeId === node.id && edge.fromPort === output,
    )?.toNodeId;
  }
  return effects;
}

export function resolveValueExpression(
  expression: ValueExpression,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): string {
  switch (expression.source) {
    case 'literal':
      return expression.value;
    case 'component': {
      if (expression.property === 'value') {
        return context.componentValues.get(expression.nodeId) ?? '';
      }
      const target = document.screens
        .flatMap((candidate) => flattenNodes(candidate.nodes))
        .find((node) => node.id === expression.nodeId);
      return target?.type === 'text' ? target.props.text : '';
    }
    case 'session': {
      const user = context.session?.user;
      if (expression.path === 'user.id') return user?.id ?? '';
      if (expression.path === 'user.name') return user?.name ?? '';
      return user?.email ?? '';
    }
    case 'node-output':
      return readOutputPath(context.nodeOutputs?.get(expression.nodeId), expression.path);
  }
}

function applyActionInputMappings(
  payload: ActionPayload,
  mappings: ActionInputMappings | undefined,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): ActionPayload {
  if (!mappings || Object.keys(mappings).length === 0) return payload;
  const resolve = (key: string, fallback: string): string =>
    mappings[key] ? resolveValueExpression(mappings[key], document, context) : fallback;
  switch (payload.type) {
    case 'change-text': return { ...payload, text: resolve('text', payload.text) };
    case 'show-message': return { ...payload, message: resolve('message', payload.message) };
    case 'send-email': return {
      ...payload,
      to: resolve('to', payload.to),
      subject: resolve('subject', payload.subject),
      body: resolve('body', payload.body),
    };
    case 'insert-record':
      return {
        ...payload,
        values: mappedRecordValues(payload.values, mappings, resolve),
      };
    case 'update-record':
      return {
        ...payload,
        recordId: resolve('$recordId', payload.recordId),
        values: mappedRecordValues(payload.values, mappings, resolve),
      };
    case 'delete-record': return { ...payload, recordId: resolve('$recordId', payload.recordId) };
    case 'navigate':
    case 'get-records':
    case 'refresh-collection':
      return payload;
  }
}

function mappedRecordValues(
  values: Record<string, string>,
  mappings: ActionInputMappings,
  resolve: (key: string, fallback: string) => string,
): Record<string, string> {
  const keys = new Set([
    ...Object.keys(values),
    ...Object.keys(mappings).filter((key) => !key.startsWith('$')),
  ]);
  return Object.fromEntries([...keys].map((key) => [key, resolve(key, values[key] ?? '')]));
}

function readOutputPath(value: unknown, path: string): string {
  let current: unknown = value;
  for (const segment of path.split('.').filter(Boolean)) {
    if (typeof current !== 'object' || current === null || !(segment in current)) return '';
    current = (current as Record<string, unknown>)[segment];
  }
  return current === null || current === undefined ? '' : String(current);
}

function evaluateCondition(
  condition: Extract<LogicGraph['nodes'][number], { kind: 'condition' }>,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): boolean {
  const reference = condition.left;
  let actual = context.componentValues.get(reference.nodeId) ?? '';
  if (reference.property === 'text') {
    const target = document.screens
      .flatMap((candidate) => flattenNodes(candidate.nodes))
      .find((node) => node.id === reference.nodeId);
    if (target?.type === 'text') {
      actual = target.props.text;
    }
  }
  switch (condition.operator) {
    case 'equals':
      return actual === condition.compareValue;
    case 'not-equals':
      return actual !== condition.compareValue;
    case 'contains':
      return actual.includes(condition.compareValue);
    case 'not-contains':
      return !actual.includes(condition.compareValue);
    case 'is-empty':
      return actual.length === 0;
    case 'is-not-empty':
      return actual.length > 0;
  }
}

function flattenNodes(nodes: readonly ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((node) =>
    node.type === 'container' ? [node, ...flattenNodes(node.children)] : [node],
  );
}

function effectFor(payload: ActionPayload, document: ProjectDocument): PreviewEffect | null {
  switch (payload.type) {
    case 'change-text': {
      return payload.targetNodeId.length > 0
        ? { kind: 'change-text', nodeId: payload.targetNodeId, text: payload.text }
        : null;
    }
    case 'show-message': {
      return payload.message.length > 0 ? { kind: 'show-message', message: payload.message } : null;
    }
    case 'navigate': {
      const exists = document.screens.some((screen) => screen.id === payload.targetScreenId);
      return exists ? { kind: 'navigate', screenId: payload.targetScreenId } : null;
    }
    case 'get-records':
    case 'insert-record':
    case 'update-record':
    case 'delete-record':
      return payload.collectionId
        ? {
          kind: 'data-operation',
            payload,
          }
        : null;
    case 'refresh-collection':
      return payload.collectionId ? { kind: 'refresh-collection', collectionId: payload.collectionId } : null;
    case 'send-email':
      return payload.to ? { kind: 'email-simulated', to: payload.to, subject: payload.subject } : null;
    default: {
      const exhaustive: never = payload;
      void exhaustive;
      return null;
    }
  }
}

/** Applies text-override effects for rendering. Deep — reaches container children. */
export function applyTextOverrides(screen: Screen, overrides: ReadonlyMap<string, string>): Screen {
  if (overrides.size === 0) {
    return screen;
  }

  const nodes = overrideTree(screen.nodes, overrides);
  if (nodes === screen.nodes) {
    return screen;
  }
  return { ...screen, nodes: [...nodes] };
}

function overrideTree(
  nodes: readonly ComponentNode[],
  overrides: ReadonlyMap<string, string>,
): readonly ComponentNode[] {
  let changed = false;
  const mapped = nodes.map((node) => {
    if (node.type === 'text' && overrides.has(node.id)) {
      changed = true;
      return { ...node, props: { ...node.props, text: overrides.get(node.id)! } };
    }
    if (node.type === 'container') {
      const children = overrideTree(node.children, overrides);
      if (children !== node.children) {
        changed = true;
        return { ...node, children: [...children] };
      }
    }
    return node;
  });
  return changed ? mapped : nodes;
}

/** Graph helper for cascade prunes (screen deletion removing dead navigate targets). */
export function pruneDeadNavigateTargets(
  graphs: readonly LogicGraph[],
  deadScreenId: string,
): readonly LogicGraph[] {
  let changed = false;
  const mapped = graphs.map((graph) => {
    const doomed = graph.nodes.flatMap((node) =>
      node.kind === 'action' &&
      node.payload.type === 'navigate' &&
      node.payload.targetScreenId === deadScreenId
        ? [node.id]
        : [],
    );
    if (doomed.length === 0) {
      return graph;
    }
    changed = true;
    return removeLogicNodes(graph, new Set(doomed));
  });
  return changed ? mapped : graphs;
}
