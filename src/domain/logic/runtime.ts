import type {
  ActionInputMappings,
  ActionPayload,
  CvEnrollPayload,
  CvLivenessPayload,
  CvVerifyPayload,
  LogicGraph,
  LogicOutputPort,
  RagIndexPayload,
  RagQueryPayload,
  RagRemovePayload,
  TriggerEvent,
  ValueExpression,
} from '../entities/logic';
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
      payload: Extract<ActionPayload, { type: 'get-records' | 'get-record' | 'insert-record' | 'update-record' | 'delete-record' }>;
    }
  | { kind: 'refresh-collection'; collectionId: string }
  | { kind: 'email-simulated'; to: string; subject: string }
  | { kind: 'set-variable'; name: string; value: string }
  | { kind: 'set-component-value'; nodeId: string; value: string }
  | { kind: 'rag-indexed'; documentId: string; chunkCount: number }
  | { kind: 'rag-removed'; documentId: string }
  | { kind: 'rag-answer'; answer: string; citations: RagCitation[] }
  | { kind: 'cv-result'; operation: string; isLive?: boolean; verified?: boolean; credentialId?: string; reason?: string };

export interface RagCitation {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface PreviewRuntimeContext {
  componentValues: ReadonlyMap<string, string>;
  session?: { user?: { id?: string; name?: string; email?: string } };
  nodeOutputs?: ReadonlyMap<string, unknown>;
  variables?: ReadonlyMap<string, string>;
  data?: {
    getRecord: (collectionId: string, recordId: string) => unknown;
    ragIndex?: (payload: RagIndexPayload) => { documentId: string; chunkCount: number };
    ragQuery?: (payload: RagQueryPayload) => { answer: string; citations: RagCitation[] };
    ragRemove?: (payload: RagRemovePayload) => { documentId: string; removed: boolean };
    cvLiveness?: (payload: CvLivenessPayload) => { isLive: boolean; confidence: number; reason: string };
    cvEnroll?: (payload: CvEnrollPayload) => { credentialId: string; enrolledAt: string; qualityScore: number };
    cvVerify?: (payload: CvVerifyPayload) => { verified: boolean; confidence: number; credentialId?: string; reason: string };
  };
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
  const outputs = new Map<string, unknown>(context.nodeOutputs ?? []);
  const variables = new Map<string, string>(context.variables ?? []);
  const runtimeContext: PreviewRuntimeContext = {
    ...context,
    nodeOutputs: outputs,
    variables,
  };
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
      const payload = applyActionInputMappings(node.payload, node.inputMappings, document, runtimeContext);
      const effect = effectFor(payload, document, runtimeContext);
      if (effect) {
        effects.push(effect);
      }
      if (payload.type === 'set-variable') {
        variables.set(payload.name, payload.value);
        outputs.set(node.id, { name: payload.name, value: payload.value });
      } else if (payload.type === 'set-component-value') {
        outputs.set(node.id, { nodeId: payload.targetNodeId, value: payload.value });
      } else if (payload.type === 'get-record') {
        const record = runtimeContext.data?.getRecord(payload.collectionId, payload.recordId) ?? { id: payload.recordId };
        outputs.set(node.id, { record });
      } else if (payload.type === 'rag-index') {
        const result = runtimeContext.data?.ragIndex?.(payload) ?? { documentId: payload.documentId, chunkCount: 1 };
        outputs.set(node.id, result);
      } else if (payload.type === 'rag-query') {
        const result = runtimeContext.data?.ragQuery?.(payload) ?? { answer: `Simulated answer for “${payload.query}”.`, citations: [] };
        outputs.set(node.id, result);
      } else if (payload.type === 'rag-remove') {
        const result = runtimeContext.data?.ragRemove?.(payload) ?? { documentId: payload.documentId, removed: true };
        outputs.set(node.id, result);
      } else if (payload.type === 'cv-liveness') {
        const result = runtimeContext.data?.cvLiveness?.(payload) ?? { isLive: true, confidence: 0.99, reason: 'simulated' };
        outputs.set(node.id, result);
      } else if (payload.type === 'cv-enroll') {
        const result = runtimeContext.data?.cvEnroll?.(payload) ?? { credentialId: `credential_${payload.userId}`, enrolledAt: new Date().toISOString(), qualityScore: 0.95 };
        outputs.set(node.id, result);
      } else if (payload.type === 'cv-verify') {
        const result = runtimeContext.data?.cvVerify?.(payload) ?? { verified: true, confidence: 0.98, credentialId: payload.credentialId, reason: 'simulated' };
        outputs.set(node.id, result);
      } else {
        outputs.set(node.id, payload);
      }
      if (payload.type === 'cv-liveness' || payload.type === 'cv-verify') {
        output = payload.mediaReference ? 'success' : 'error';
      } else if (payload.type === 'cv-enroll') {
        output = payload.mediaReference && payload.userId && payload.consent ? 'success' : 'error';
      } else {
        output = isAsyncActionPayload(payload) ? 'success' : 'next';
      }
    } else if (node.kind === 'condition') {
      output = evaluateCondition(node, document, runtimeContext) ? 'true' : 'false';
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
    case 'variable':
      return context.variables?.get(expression.name) ?? '';
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
    case 'set-variable': return { ...payload, value: resolve('value', payload.value) };
    case 'set-component-value': return { ...payload, value: resolve('value', payload.value) };
    case 'rag-index': return {
      ...payload,
      documentId: resolve('documentId', payload.documentId),
      title: resolve('title', payload.title),
      content: resolve('content', payload.content),
      knowledgeBaseId: resolve('knowledgeBaseId', payload.knowledgeBaseId ?? ''),
    };
    case 'rag-query': return {
      ...payload,
      query: resolve('query', payload.query),
      knowledgeBaseId: resolve('knowledgeBaseId', payload.knowledgeBaseId ?? ''),
    };
    case 'rag-remove': return {
      ...payload,
      documentId: resolve('documentId', payload.documentId),
      knowledgeBaseId: resolve('knowledgeBaseId', payload.knowledgeBaseId ?? ''),
    };
    case 'cv-liveness': return { ...payload, mediaReference: resolve('mediaReference', payload.mediaReference) };
    case 'cv-enroll': return {
      ...payload,
      mediaReference: resolve('mediaReference', payload.mediaReference),
      userId: resolve('userId', payload.userId),
    };
    case 'cv-verify': return {
      ...payload,
      mediaReference: resolve('mediaReference', payload.mediaReference),
      userId: resolve('userId', payload.userId ?? ''),
      credentialId: resolve('credentialId', payload.credentialId ?? ''),
    };
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
    case 'get-record': {
      const recordId = mappings?.['$recordId']
        ? resolve('$recordId', payload.recordId)
        : mappings?.recordId
          ? resolve('recordId', payload.recordId)
          : payload.recordId;
      return { ...payload, recordId };
    }
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
  const actual = resolveValueExpression(condition.left, document, context);
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

function effectFor(payload: ActionPayload, document: ProjectDocument, context: PreviewRuntimeContext = { componentValues: new Map() }): PreviewEffect | null {
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
    case 'get-record':
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
    case 'rag-index':
      return payload.documentId ? { kind: 'rag-indexed', documentId: payload.documentId, chunkCount: 1 } : null;
    case 'rag-query': {
      const result = context.data?.ragQuery?.(payload) ?? { answer: `Simulated answer for “${payload.query}”.`, citations: [] };
      return payload.query ? { kind: 'rag-answer', answer: result.answer, citations: result.citations } : null;
    }
    case 'rag-remove':
      return payload.documentId ? { kind: 'rag-removed', documentId: payload.documentId } : null;
    case 'cv-liveness': {
      if (!payload.mediaReference) return null;
      const result = context.data?.cvLiveness?.(payload) ?? {
        isLive: true,
        confidence: 0.99,
        reason: 'simulated',
      };
      return {
        kind: 'cv-result',
        operation: 'liveness',
        isLive: result.isLive,
        reason: result.reason,
      };
    }
    case 'cv-enroll': {
      if (!payload.mediaReference || !payload.consent || !payload.userId) return null;
      const result = context.data?.cvEnroll?.(payload) ?? {
        credentialId: `credential_${payload.userId}`,
        enrolledAt: new Date(0).toISOString(),
        qualityScore: 0.95,
      };
      return {
        kind: 'cv-result',
        operation: 'enroll',
        credentialId: result.credentialId,
        reason: 'simulated',
      };
    }
    case 'cv-verify': {
      if (!payload.mediaReference) return null;
      const result = context.data?.cvVerify?.(payload) ?? {
        verified: true,
        confidence: 0.98,
        credentialId: payload.credentialId,
        reason: 'simulated',
      };
      return {
        kind: 'cv-result',
        operation: 'verify',
        verified: result.verified,
        credentialId: result.credentialId || undefined,
        reason: result.reason,
      };
    }
    case 'set-variable':
      return payload.name ? { kind: 'set-variable', name: payload.name, value: payload.value } : null;
    case 'set-component-value':
      return payload.targetNodeId ? { kind: 'set-component-value', nodeId: payload.targetNodeId, value: payload.value } : null;
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
