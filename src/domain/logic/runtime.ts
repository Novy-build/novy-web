import type {
  ActionInputMappings,
  ActionPayload,
  CvEnrollPayload,
  CvLivenessPayload,
  CvVerifyPayload,
  LogicGraph,
  LogicOutputPort,
  TriggerEvent,
  ValueExpression,
} from '../entities/logic';
import type { ProjectDocument, Screen } from '../entities/screen';
import type { ComponentNode } from '../entities/componentNode';
import type { DataFieldType, DataValue, ListItemContext } from '../entities/appData';
import { isChildBearingNode } from '../entities/componentNode';
import { removeLogicNodes } from './graph';
import { isAsyncActionPayload } from './graph';
import { generateId } from '../ids';

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
  | {
      kind: 'add-local-list-item';
      listViewId: string;
      placement: 'append' | 'prepend';
      item: { itemId: string; values: Readonly<Record<string, DataValue>> };
    }
  | { kind: 'vector-indexed'; insertedCount: number }
  | { kind: 'vector-deleted'; documentId: string }
  | { kind: 'chat-response'; nodeId: string; citationsNodeId?: string; answer: string; citations: RagCitation[] }
  | { kind: 'cv-result'; operation: string; isLive?: boolean; verified?: boolean; credentialId?: string; reason?: string };

export type DataOperationPayload = Extract<ActionPayload, {
  type: 'get-records' | 'get-record' | 'insert-record' | 'update-record' | 'delete-record';
}>;

export type AsyncPreviewEffect = PreviewEffect | { kind: 'data-operation-error'; message: string };

export interface AsyncPreviewRuntimeContext extends PreviewRuntimeContext {
  executeDataOperation: (payload: DataOperationPayload) => Promise<unknown>;
}

export interface RagCitation {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface PreviewRuntimeContext {
  componentValues: ReadonlyMap<string, string>;
  listItem?: ListItemContext;
  session?: { user?: { id?: string; name?: string; email?: string } };
  nodeOutputs?: ReadonlyMap<string, unknown>;
  variables?: ReadonlyMap<string, string>;
  /** Runtime-owned ID factory; keeps workflow evaluation deterministic and testable. */
  createLocalListItemId?: (listViewId: string, logicNodeId: string) => string;
  data?: {
    getRecord: (collectionId: string, recordId: string) => unknown;
    loadCollectionDocuments?: (collectionId: string, contentFieldId: string, titleFieldId?: string, documentIdFieldId?: string) => readonly unknown[];
    vectorUpsert?: (chunks: readonly unknown[]) => { insertedCount: number; updatedCount: number };
    vectorDelete?: (documentId: string) => { removedCount: number };
    vectorRetrieve?: (question: string, topK: number, minimumScore: number) => readonly unknown[];
    memoryLoad?: (conversationId: string, windowSize: number) => readonly unknown[];
    memoryAppend?: (conversationId: string, messages: readonly unknown[]) => number;
    memoryClear?: (conversationId: string) => void;
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
      const inputs = resolveInputMappings(node.inputMappings, document, runtimeContext);
      const payload = applyActionInputMappings(node.payload, node.inputMappings, document, runtimeContext);
      if (payload.type === 'set-variable') {
        variables.set(payload.name, payload.value);
        outputs.set(node.id, { name: payload.name, value: payload.value });
      } else if (payload.type === 'set-component-value') {
        outputs.set(node.id, { nodeId: payload.targetNodeId, value: payload.value });
      } else if (payload.type === 'add-local-list-item') {
        const itemId = runtimeContext.createLocalListItemId?.(payload.targetNodeId, node.id)
          ?? generateId('local-list-item');
        outputs.set(node.id, {
          item: {
            id: itemId,
            listViewId: payload.targetNodeId,
            values: { ...payload.values },
          },
        });
      } else if (payload.type === 'get-record') {
        const record = runtimeContext.data?.getRecord(payload.collectionId, payload.recordId) ?? { id: payload.recordId };
        outputs.set(node.id, { record });
      } else if (payload.type === 'insert-record' || payload.type === 'update-record') {
        outputs.set(node.id, {
          record: {
            id: payload.type === 'update-record' ? payload.recordId : `preview-record-${node.id}`,
            collectionId: payload.collectionId,
            values: { ...payload.values },
          },
        });
      } else if (payload.type === 'delete-record') {
        outputs.set(node.id, { deletedRecordId: payload.recordId, collectionId: payload.collectionId });
      } else if (payload.type === 'vector-store') {
        outputs.set(node.id, executeVectorStore(node.id, payload, graph, inputs, outputs, runtimeContext));
      } else if (payload.type === 'ai-agent') {
        outputs.set(node.id, executeAiAgent(node.id, payload, graph, inputs, outputs, runtimeContext));
      } else if (payload.type === 'chat-model') {
        outputs.set(node.id, { model: payload.model, profileId: payload.connectionProfileId });
      } else if (isGranularRagPayload(payload)) {
        outputs.set(node.id, executeGranularRagAction(payload, inputs, runtimeContext));
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
      const effect = effectFor(payload, document, runtimeContext, inputs, outputs.get(node.id));
      if (effect) effects.push(effect);
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
      (edge) => edge.kind !== 'resource' && edge.toPort === 'in' && edge.fromNodeId === node.id && edge.fromPort === output,
    )?.toNodeId;
  }
  return effects;
}

/**
 * Executes a preview workflow while awaiting database operations before
 * selecting their success/error output. The synchronous runner remains for
 * generated-runtime planning and pure tests; interactive preview uses this
 * function so a navigation step cannot run before a write has succeeded.
 */
export async function runBehaviorAsync(
  document: ProjectDocument,
  screen: Screen,
  sourceNodeId: string,
  event: TriggerEvent,
  context: AsyncPreviewRuntimeContext,
): Promise<AsyncPreviewEffect[]> {
  const behavior = screen.behaviors.find(
    (candidate) => candidate.event === event && candidate.targetNodeId === sourceNodeId,
  );
  if (!behavior) return [];
  const graph = screen.logicGraphs.find((candidate) => candidate.id === behavior.graphId);
  if (!graph) return [];
  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  if (!trigger) return [];

  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const effects: AsyncPreviewEffect[] = [];
  const outputs = new Map<string, unknown>(context.nodeOutputs ?? []);
  const variables = new Map<string, string>(context.variables ?? []);
  const runtimeContext: AsyncPreviewRuntimeContext = {
    ...context,
    nodeOutputs: outputs,
    variables,
  };
  let currentId: string | undefined = trigger.id;
  let steps = 0;

  while (currentId && steps < MAX_RUNTIME_STEPS) {
    steps += 1;
    const node = byId.get(currentId);
    if (!node) break;
    let output: LogicOutputPort = 'next';

    if (node.kind === 'action') {
      const inputs = resolveInputMappings(node.inputMappings, document, runtimeContext);
      const payload = applyActionInputMappings(node.payload, node.inputMappings, document, runtimeContext);

      if (isDataOperationPayload(payload)) {
        try {
          const result = await context.executeDataOperation(payload);
          outputs.set(node.id, result);
          output = 'success';
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Database operation failed.';
          outputs.set(node.id, { error: message });
          effects.push({ kind: 'data-operation-error', message });
          output = 'error';
        }
      } else {
        setActionOutput(node.id, payload, graph, inputs, outputs, runtimeContext);
        const effect = effectFor(payload, document, runtimeContext, inputs, outputs.get(node.id));
        if (effect) effects.push(effect);
        if (payload.type === 'cv-liveness' || payload.type === 'cv-verify') {
          output = payload.mediaReference ? 'success' : 'error';
        } else if (payload.type === 'cv-enroll') {
          output = payload.mediaReference && payload.userId && payload.consent ? 'success' : 'error';
        } else {
          output = isAsyncActionPayload(payload) ? 'success' : 'next';
        }
      }
    } else if (node.kind === 'condition') {
      output = evaluateCondition(node, document, runtimeContext) ? 'true' : 'false';
    }

    currentId = graph.edges.find(
      (edge) => edge.kind !== 'resource' && edge.toPort === 'in' && edge.fromNodeId === node.id && edge.fromPort === output,
    )?.toNodeId;
  }

  return effects;
}

function isDataOperationPayload(payload: ActionPayload): payload is DataOperationPayload {
  return payload.type === 'get-records' || payload.type === 'get-record' || payload.type === 'insert-record' ||
    payload.type === 'update-record' || payload.type === 'delete-record';
}

function setActionOutput(
  nodeId: string,
  payload: ActionPayload,
  graph: LogicGraph,
  inputs: Readonly<Record<string, unknown>>,
  outputs: Map<string, unknown>,
  runtimeContext: PreviewRuntimeContext,
): void {
  if (payload.type === 'set-variable') {
    runtimeContext.variables instanceof Map && runtimeContext.variables.set(payload.name, payload.value);
    outputs.set(nodeId, { name: payload.name, value: payload.value });
  } else if (payload.type === 'set-component-value') {
    outputs.set(nodeId, { nodeId: payload.targetNodeId, value: payload.value });
  } else if (payload.type === 'add-local-list-item') {
    const itemId = runtimeContext.createLocalListItemId?.(payload.targetNodeId, nodeId) ?? generateId('local-list-item');
    outputs.set(nodeId, { item: { id: itemId, listViewId: payload.targetNodeId, values: { ...payload.values } } });
  } else if (payload.type === 'vector-store') {
    outputs.set(nodeId, executeVectorStore(nodeId, payload, graph, inputs, outputs, runtimeContext));
  } else if (payload.type === 'ai-agent') {
    outputs.set(nodeId, executeAiAgent(nodeId, payload, graph, inputs, outputs, runtimeContext));
  } else if (payload.type === 'chat-model') {
    outputs.set(nodeId, { model: payload.model, profileId: payload.connectionProfileId });
  } else if (isGranularRagPayload(payload)) {
    outputs.set(nodeId, executeGranularRagAction(payload, inputs, runtimeContext));
  } else if (payload.type === 'cv-liveness') {
    outputs.set(nodeId, runtimeContext.data?.cvLiveness?.(payload) ?? { isLive: true, confidence: 0.99, reason: 'simulated' });
  } else if (payload.type === 'cv-enroll') {
    outputs.set(nodeId, runtimeContext.data?.cvEnroll?.(payload) ?? { credentialId: `credential_${payload.userId}`, enrolledAt: new Date().toISOString(), qualityScore: 0.95 });
  } else if (payload.type === 'cv-verify') {
    outputs.set(nodeId, runtimeContext.data?.cvVerify?.(payload) ?? { verified: true, confidence: 0.98, credentialId: payload.credentialId, reason: 'simulated' });
  } else {
    outputs.set(nodeId, payload);
  }
}

export function resolveValueExpression(
  expression: ValueExpression,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): unknown {
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
    case 'list-item':
      return context.listItem?.values[expression.fieldId] ?? '';
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
    mappings[key] ? runtimeText(resolveValueExpression(mappings[key], document, context)) : fallback;
  switch (payload.type) {
    case 'change-text': return { ...payload, text: resolve('text', payload.text) };
    case 'show-message': return { ...payload, message: resolve('message', payload.message) };
    case 'set-variable': return { ...payload, value: resolve('value', payload.value) };
    case 'set-component-value': return { ...payload, value: resolve('value', payload.value) };
    case 'add-local-list-item':
      return {
        ...payload,
        values: mappedLocalListItemValues(payload.targetNodeId, payload.values, mappings, document, context),
      };
    case 'document-load': return {
      ...payload,
      sourceReference: resolve('sourceReference', payload.sourceReference),
      documentId: resolve('documentId', payload.documentId),
      title: resolve('title', payload.title),
      text: resolve('text', payload.text),
    };
    case 'vector-delete': return { ...payload, documentId: resolve('documentId', payload.documentId) };
    case 'chat-input': return { ...payload, staticQuestion: resolve('question', payload.staticQuestion) };
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
    case 'text-split':
    case 'embedding-generate':
    case 'vector-upsert':
    case 'query-embedding':
    case 'vector-retrieve':
    case 'rerank':
    case 'prompt-template':
    case 'llm-generate':
    case 'chat-output':
    case 'memory':
    case 'vector-store':
    case 'chat-model':
    case 'ai-agent':
      return payload;
  }
}

type GranularRagPayload = Extract<ActionPayload, {
  type:
    | 'document-load'
    | 'text-split'
    | 'embedding-generate'
    | 'vector-upsert'
    | 'vector-delete'
    | 'chat-input'
    | 'query-embedding'
    | 'vector-retrieve'
    | 'rerank'
    | 'prompt-template'
    | 'llm-generate'
    | 'chat-output'
    | 'memory';
}>;

function isGranularRagPayload(payload: ActionPayload): payload is GranularRagPayload {
  return [
    'document-load', 'text-split', 'embedding-generate', 'vector-upsert', 'vector-delete',
    'chat-input', 'query-embedding', 'vector-retrieve', 'rerank', 'prompt-template',
    'llm-generate', 'chat-output', 'memory',
  ].includes(payload.type);
}

function resolveInputMappings(
  mappings: ActionInputMappings | undefined,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(mappings ?? {}).map(([key, expression]) => [
    key,
    resolveValueExpression(expression, document, context),
  ]));
}

function executeGranularRagAction(
  payload: GranularRagPayload,
  inputs: Readonly<Record<string, unknown>>,
  context: PreviewRuntimeContext,
): unknown {
  switch (payload.type) {
    case 'document-load': {
      const supplied = runtimeArray(inputs.documents);
      if (supplied.length > 0) return { documents: supplied };
      if (payload.source === 'collection' && payload.collectionId && payload.contentFieldId) {
        return {
          documents: [...(context.data?.loadCollectionDocuments?.(
            payload.collectionId,
            payload.contentFieldId,
            payload.titleFieldId,
            payload.documentIdFieldId,
          ) ?? [])],
        };
      }
      return {
        documents: [{
          id: payload.documentId || 'preview-document',
          title: payload.title || 'Preview document',
          text: payload.text || `Simulated content from ${payload.sourceReference || payload.source}.`,
          metadata: { ...payload.metadata },
        }],
      };
    }
    case 'text-split': {
      const documents = runtimeArray(inputs.documents);
      const chunks = documents.flatMap((document, documentIndex) => {
        const record = runtimeRecord(document);
        const text = runtimeText(record.text);
        const documentId = runtimeText(record.id) || `document-${documentIndex + 1}`;
        return splitText(text, payload.chunkSize, payload.chunkOverlap).map((chunk, index) => ({
          id: `${documentId}-chunk-${index + 1}`,
          documentId,
          text: chunk,
          tokenCount: Math.max(1, Math.ceil(chunk.length / 4)),
          title: runtimeText(record.title),
          metadata: runtimeRecord(record.metadata),
        }));
      });
      return { chunks };
    }
    case 'embedding-generate': {
      const chunks = runtimeArray(inputs.chunks);
      return {
        chunks,
        embeddings: chunks.map((chunk, index) => {
          const record = runtimeRecord(chunk);
          const chunkId = runtimeText(record.id) || `chunk-${index + 1}`;
          return { chunkId, embeddingReference: `preview-embedding:${chunkId}`, dimensions: 0 };
        }),
      };
    }
    case 'vector-upsert': {
      const chunks = runtimeArray(inputs.chunks);
      const result = context.data?.vectorUpsert?.(chunks) ?? { insertedCount: chunks.length, updatedCount: 0 };
      return { ...result, indexName: payload.indexName, namespace: payload.namespace };
    }
    case 'vector-delete':
      return { ...(context.data?.vectorDelete?.(payload.documentId) ?? { removedCount: payload.documentId ? 1 : 0 }), documentId: payload.documentId };
    case 'chat-input': {
      const question = runtimeText(inputs.question) ||
        (payload.componentId ? context.componentValues.get(payload.componentId) ?? '' : '') ||
        payload.staticQuestion;
      return { question, conversationId: runtimeText(inputs.conversationId) || 'preview-conversation' };
    }
    case 'query-embedding': {
      const question = runtimeText(inputs.question);
      return { question, embeddingReference: `preview-query:${stableHash(question)}`, dimensions: 0 };
    }
    case 'vector-retrieve': {
      const providedMatches = runtimeArray(inputs.matches);
      const question = runtimeText(inputs.question);
      const matches = providedMatches.length > 0
        ? providedMatches
        : [...(context.data?.vectorRetrieve?.(question, payload.topK, payload.minimumScore) ?? [])];
      return { matches: matches.slice(0, payload.topK), topK: payload.topK };
    }
    case 'rerank': {
      const matches = runtimeArray(inputs.matches)
        .map(runtimeRecord)
        .filter((match) => runtimeNumber(match.score) >= payload.minimumScore)
        .sort((left, right) => runtimeNumber(right.score) - runtimeNumber(left.score))
        .slice(0, payload.topN);
      return { matches };
    }
    case 'prompt-template': {
      const question = runtimeText(inputs.question);
      const matches = runtimeArray(inputs.matches).map(runtimeRecord);
      const contextText = matches.map((match) => runtimeText(match.text)).filter(Boolean).join(payload.contextSeparator);
      if (!contextText && payload.emptyContextBehavior === 'return-empty') return { prompt: '', question, matches };
      return {
        prompt: payload.template.replaceAll('{context}', contextText).replaceAll('{question}', question),
        question,
        matches,
      };
    }
    case 'llm-generate': {
      const prompt = runtimeText(inputs.prompt);
      const matches = runtimeArray(inputs.matches).map(runtimeRecord);
      const citations = matches.map((match, index): RagCitation => ({
        documentId: runtimeText(match.documentId) || runtimeText(match.id) || `document-${index + 1}`,
        title: runtimeText(match.title) || `Source ${index + 1}`,
        snippet: runtimeText(match.text),
        score: runtimeNumber(match.score),
      }));
      return {
        answer: prompt ? `Simulated answer based on the compiled prompt.` : 'No relevant context was found.',
        citations,
        finishReason: 'simulated',
      };
    }
    case 'chat-output':
      return { answer: runtimeText(inputs.answer), citations: runtimeArray(inputs.citations) };
    case 'memory': {
      const conversationId = runtimeText(inputs.conversationId) || 'preview-conversation';
      if (payload.operation === 'clear') {
        context.data?.memoryClear?.(conversationId);
        return { operation: payload.operation, conversationId, messages: [] };
      }
      if (payload.operation === 'load') {
        const messages = context.data?.memoryLoad?.(conversationId, payload.windowSize) ?? runtimeArray(inputs.messages).slice(-payload.windowSize);
        return { operation: payload.operation, conversationId, messages };
      }
      const messages = [
        ...runtimeArray(inputs.messages),
        ...(runtimeText(inputs.question) ? [{ role: 'user', content: runtimeText(inputs.question) }] : []),
        ...(runtimeText(inputs.answer) ? [{ role: 'assistant', content: runtimeText(inputs.answer) }] : []),
      ].slice(-payload.windowSize);
      context.data?.memoryAppend?.(conversationId, messages);
      return { operation: payload.operation, conversationId, messages };
    }
  }
}

function executeVectorStore(
  nodeId: string,
  payload: Extract<ActionPayload, { type: 'vector-store' }>,
  graph: LogicGraph,
  inputs: Readonly<Record<string, unknown>>,
  outputs: ReadonlyMap<string, unknown>,
  context: PreviewRuntimeContext,
): unknown {
  const previous = previousControlOutput(graph, nodeId, outputs);
  if (payload.operation === 'delete') {
    const previousRecord = runtimeRecord(previous);
    const documentId = runtimeText(inputs.documentId) || payload.documentId ||
      runtimeText(previousRecord.deletedRecordId) || runtimeText(runtimeRecord(previousRecord.record).id);
    const result = context.data?.vectorDelete?.(documentId) ?? { removedCount: documentId ? 1 : 0 };
    return { ...result, documentId };
  }
  if (payload.operation === 'retrieve-tool') {
    return { toolName: `vector:${payload.indexName}`, operation: payload.operation };
  }

  let documents: unknown[] = [];
  let chunks: unknown[] = [];
  if (payload.documentInputMode === 'previous-output') {
    const previousRecord = runtimeRecord(previous);
    const record = runtimeRecord(previousRecord.record);
    const values = runtimeRecord(record.values);
    documents = [{
      id: runtimeText(record.id) || `document-${nodeId}`,
      title: runtimeText(values.title),
      text: runtimeText(values.content) || runtimeText(values.text),
      metadata: { collectionId: runtimeText(record.collectionId) },
    }];
    chunks = documents;
  } else {
    const loader = attachedAction(graph, nodeId, 'documents');
    if (loader?.payload.type === 'document-load') {
      const previousRecord = runtimeRecord(previous);
      const record = runtimeRecord(previousRecord.record);
      const values = runtimeRecord(record.values);
      const inheritedDocuments = loader.payload.source === 'previous-output' && Object.keys(record).length > 0
        ? [{
            id: runtimeText(record.id) || `document-${nodeId}`,
            title: runtimeText(values.title),
            text: runtimeText(values.content) || runtimeText(values.text),
            metadata: { collectionId: runtimeText(record.collectionId) },
          }]
        : [];
      const loaded = runtimeRecord(executeGranularRagAction(loader.payload, { documents: inheritedDocuments }, context));
      documents = runtimeArray(loaded.documents);
      const splitter = attachedAction(graph, loader.id, 'text-splitter');
      if (splitter?.payload.type === 'text-split') {
        const split = runtimeRecord(executeGranularRagAction(splitter.payload, { documents }, context));
        chunks = runtimeArray(split.chunks);
      } else {
        chunks = documents;
      }
    }
  }
  const result = context.data?.vectorUpsert?.(chunks) ?? { insertedCount: chunks.length, updatedCount: 0 };
  return { ...result, documents, chunks, indexName: payload.indexName, namespace: payload.namespace };
}

function executeAiAgent(
  nodeId: string,
  payload: Extract<ActionPayload, { type: 'ai-agent' }>,
  graph: LogicGraph,
  inputs: Readonly<Record<string, unknown>>,
  outputs: ReadonlyMap<string, unknown>,
  context: PreviewRuntimeContext,
): unknown {
  const previous = runtimeRecord(previousControlOutput(graph, nodeId, outputs));
  const question = runtimeText(inputs.question) || runtimeText(previous.question);
  const conversationId = runtimeText(inputs.conversationId) || runtimeText(previous.conversationId) || 'preview-conversation';
  const tool = attachedAction(graph, nodeId, 'tool');
  let matches: Record<string, unknown>[] = [];
  if (tool?.payload.type === 'vector-store' && tool.payload.operation === 'retrieve-tool') {
    matches = [...(context.data?.vectorRetrieve?.(question, tool.payload.topK, tool.payload.minimumScore) ?? [])].map(runtimeRecord);
    const reranker = attachedAction(graph, tool.id, 'reranker');
    if (reranker?.payload.type === 'rerank') {
      const rerankerPayload = reranker.payload;
      matches = matches
        .filter((match) => runtimeNumber(match.score) >= rerankerPayload.minimumScore)
        .sort((left, right) => runtimeNumber(right.score) - runtimeNumber(left.score))
        .slice(0, rerankerPayload.topN);
    }
  }
  const memoryNode = attachedAction(graph, nodeId, 'memory');
  const messages = memoryNode?.payload.type === 'memory'
    ? [...(context.data?.memoryLoad?.(conversationId, memoryNode.payload.windowSize) ?? [])]
    : [];
  const promptNode = attachedAction(graph, nodeId, 'prompt-template');
  const contextText = matches.map((match) => runtimeText(match.text)).filter(Boolean).join('\n\n---\n\n');
  const prompt = promptNode?.payload.type === 'prompt-template'
    ? promptNode.payload.template.replaceAll('{context}', contextText).replaceAll('{question}', question)
    : `${payload.instructions}\n\nContext:\n${contextText}\n\nQuestion:\n${question}`;
  const citations = matches.map((match, index): RagCitation => ({
    documentId: runtimeText(match.documentId) || runtimeText(match.id) || `document-${index + 1}`,
    title: runtimeText(match.title) || `Source ${index + 1}`,
    snippet: runtimeText(match.text),
    score: runtimeNumber(match.score),
  }));
  const answer = contextText
    ? 'Simulated agent answer based on the attached vector-store tool.'
    : 'No relevant context was found by the attached tools.';
  if (memoryNode?.payload.type === 'memory') {
    context.data?.memoryAppend?.(conversationId, [
      ...messages,
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ].slice(-memoryNode.payload.windowSize));
  }
  return {
    answer,
    citations,
    conversationId,
    prompt,
    toolCalls: tool ? [{ tool: `vector:${tool.payload.type === 'vector-store' ? tool.payload.indexName : ''}` }] : [],
    finishReason: 'simulated',
  };
}

function attachedAction(
  graph: LogicGraph,
  targetNodeId: string,
  toPort: import('../entities/logic').LogicResourcePort,
): Extract<LogicGraph['nodes'][number], { kind: 'action' }> | undefined {
  const edge = graph.edges.find((candidate) =>
    (candidate.kind === 'resource' || candidate.toPort !== 'in') &&
    candidate.toNodeId === targetNodeId && candidate.toPort === toPort);
  const node = edge ? graph.nodes.find((candidate) => candidate.id === edge.fromNodeId) : undefined;
  return node?.kind === 'action' ? node : undefined;
}

function previousControlOutput(
  graph: LogicGraph,
  targetNodeId: string,
  outputs: ReadonlyMap<string, unknown>,
): unknown {
  const edge = graph.edges.find((candidate) =>
    candidate.kind !== 'resource' && candidate.toNodeId === targetNodeId && candidate.toPort === 'in');
  return edge ? outputs.get(edge.fromNodeId) : undefined;
}

function runtimeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function runtimeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function runtimeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function runtimeRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function splitText(text: string, chunkSize: number, overlap: number): string[] {
  if (!text) return [];
  const size = Math.max(1, chunkSize);
  const step = Math.max(1, size - Math.max(0, overlap));
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + size));
    if (start + size >= text.length) break;
  }
  return chunks;
}

function stableHash(value: string): string {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
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

function mappedLocalListItemValues(
  targetNodeId: string,
  values: Record<string, DataValue>,
  mappings: ActionInputMappings,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): Record<string, DataValue> {
  const target = document.screens
    .flatMap((screen) => flattenNodes(screen.nodes))
    .find((node) => node.id === targetNodeId && node.type === 'listview');
  const fields = target?.type === 'listview' && target.props.dataSource.kind === 'static'
    ? target.props.dataSource.fields
    : [];
  const fieldTypeById = new Map(fields.map((field) => [field.id, field.type]));
  const keys = new Set([
    ...Object.keys(values),
    ...Object.keys(mappings).filter((key) => !key.startsWith('$')),
  ]);
  return Object.fromEntries([...keys].map((key) => {
    const candidate = mappings[key]
      ? resolveValueExpression(mappings[key], document, context)
      : values[key] ?? null;
    return [key, coerceDataValue(candidate, fieldTypeById.get(key))];
  }));
}

function coerceDataValue(value: unknown, type: DataFieldType | undefined): DataValue {
  if (value === null || value === undefined) return null;
  if (type === 'number') {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return null;
  }
  if (type === 'text' || type === 'date') return runtimeText(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return runtimeText(value);
}

function readOutputPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const segment of path.split('.').filter(Boolean)) {
    if (typeof current !== 'object' || current === null || !(segment in current)) return '';
    current = (current as Record<string, unknown>)[segment];
  }
  return current ?? '';
}

function evaluateCondition(
  condition: Extract<LogicGraph['nodes'][number], { kind: 'condition' }>,
  document: ProjectDocument,
  context: PreviewRuntimeContext,
): boolean {
  const actual = runtimeText(resolveValueExpression(condition.left, document, context));
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
    isChildBearingNode(node) ? [node, ...flattenNodes(node.children)] : [node],
  );
}

function effectFor(
  payload: ActionPayload,
  document: ProjectDocument,
  context: PreviewRuntimeContext = { componentValues: new Map() },
  inputs: Readonly<Record<string, unknown>> = {},
  output?: unknown,
): PreviewEffect | null {
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
    case 'vector-upsert':
      return { kind: 'vector-indexed', insertedCount: runtimeNumber(runtimeRecord(output).insertedCount) };
    case 'vector-delete':
      return payload.documentId ? { kind: 'vector-deleted', documentId: payload.documentId } : null;
    case 'vector-store': {
      const result = runtimeRecord(output);
      if (payload.operation === 'upsert') return { kind: 'vector-indexed', insertedCount: runtimeNumber(result.insertedCount) };
      if (payload.operation === 'delete') return runtimeText(result.documentId)
        ? { kind: 'vector-deleted', documentId: runtimeText(result.documentId) }
        : null;
      return null;
    }
    case 'chat-output': {
      const result = runtimeRecord(output);
      const citations = runtimeArray(result.citations).map((citation) => {
        const value = runtimeRecord(citation);
        return {
          documentId: runtimeText(value.documentId),
          title: runtimeText(value.title),
          snippet: runtimeText(value.snippet),
          score: runtimeNumber(value.score),
        };
      });
      const answer = runtimeText(result.answer) || runtimeText(inputs.answer);
      return payload.targetNodeId ? {
        kind: 'chat-response',
        nodeId: payload.targetNodeId,
        ...(payload.citationsNodeId ? { citationsNodeId: payload.citationsNodeId } : {}),
        answer,
        citations,
      } : null;
    }
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
    case 'add-local-list-item': {
      const target = document.screens
        .flatMap((screen) => flattenNodes(screen.nodes))
        .find((node) => node.id === payload.targetNodeId);
      if (target?.type !== 'listview' || target.props.dataSource.kind !== 'static') return null;
      const item = runtimeRecord(runtimeRecord(output).item);
      const itemId = runtimeText(item.id);
      if (!itemId) return null;
      return {
        kind: 'add-local-list-item',
        listViewId: payload.targetNodeId,
        placement: payload.placement,
        item: { itemId, values: { ...payload.values } },
      };
    }
    case 'document-load':
    case 'text-split':
    case 'embedding-generate':
    case 'chat-input':
    case 'query-embedding':
    case 'vector-retrieve':
    case 'rerank':
    case 'prompt-template':
    case 'llm-generate':
    case 'memory':
    case 'chat-model':
    case 'ai-agent':
      return null;
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
    if (isChildBearingNode(node)) {
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
