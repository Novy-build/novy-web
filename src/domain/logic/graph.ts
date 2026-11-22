import type {
  ActionNode,
  ActionInputMappings,
  ActionPayload,
  ConditionNode,
  LogicEdge,
  LogicGraph,
  LogicInputPort,
  LogicNode,
  LogicNodePosition,
  LogicOutputPort,
  LogicResourcePort,
  TriggerEvent,
} from '../entities/logic';
import {
  createActionNode,
  createConditionNode,
  createDefaultActionPayload,
  createTriggerNode,
} from '../factories/logic';
import { generateId } from '../ids';
import type { ReadonlySetLike } from './shared';

/** Deterministic display order: reachable breadth-first nodes, then orphans. */
export function orderChain(graph: LogicGraph): LogicNode[] {
  const trigger = graph.nodes.find((node) => node.kind === 'trigger');
  if (!trigger) {
    return [...graph.nodes];
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const ordered: LogicNode[] = [];
  const visited = new Set<string>();
  const queue = [trigger.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) {
      continue;
    }
    const node = byId.get(id);
    if (!node) {
      continue;
    }
    visited.add(id);
    ordered.push(node);
    graph.edges
      .filter((edge) => edge.fromNodeId === id && edge.kind !== 'resource')
      .sort((left, right) => portOrder(left.fromPort) - portOrder(right.fromPort))
      .forEach((edge) => queue.push(edge.toNodeId));
  }
  return [...ordered, ...graph.nodes.filter((node) => !visited.has(node.id))];
}

export function connectLogicPorts(
  graph: LogicGraph,
  fromNodeId: string,
  fromPort: LogicOutputPort,
  toNodeId: string,
  toPort: LogicInputPort = 'in',
): LogicGraph | null {
  if (!canConnectLogicPorts(graph, fromNodeId, fromPort, toNodeId, toPort)) {
    return null;
  }
  return {
    ...graph,
    edges: [
      ...graph.edges,
      {
        id: generateId('edge'),
        fromNodeId,
        fromPort,
        toNodeId,
        toPort,
        kind: toPort === 'in' ? 'control' : 'resource',
      },
    ],
  };
}

export function canConnectLogicPorts(
  graph: LogicGraph,
  fromNodeId: string,
  fromPort: LogicOutputPort,
  toNodeId: string,
  toPort: LogicInputPort = 'in',
): boolean {
  const from = graph.nodes.find((node) => node.id === fromNodeId);
  const to = graph.nodes.find((node) => node.id === toNodeId);
  if (!from || !to || fromNodeId === toNodeId || to.kind === 'trigger') {
    return false;
  }
  if (toPort !== 'in') {
    if (fromPort !== toPort) return false;
    if (!resourceOutputPortsFor(from).includes(fromPort as LogicResourcePort)) return false;
    if (!resourceInputPortsFor(to).includes(toPort as LogicResourcePort)) return false;
    if (toPort !== 'tool' && graph.edges.some((edge) => edge.toNodeId === toNodeId && edge.toPort === toPort)) return false;
    return !wouldCreateCycle(graph, fromNodeId, toNodeId);
  }
  if (!outputPortsFor(from).includes(fromPort)) {
    return false;
  }
  if (graph.edges.some((edge) => edge.kind !== 'resource' && edge.fromNodeId === fromNodeId && edge.fromPort === fromPort)) {
    return false;
  }
  if (graph.edges.some((edge) => edge.kind !== 'resource' && edge.toNodeId === toNodeId && edge.toPort === toPort)) {
    return false;
  }
  if (wouldCreateCycle(graph, fromNodeId, toNodeId)) {
    return false;
  }
  return true;
}

/** Backwards-compatible reducer/domain entry using default flow ports. */
export function addConnection(
  graph: LogicGraph,
  fromNodeId: string,
  toNodeId: string,
): LogicGraph | null {
  const source = graph.nodes.find((node) => node.id === fromNodeId);
  const port = source ? outputPortsFor(source)[0] : undefined;
  return port ? connectLogicPorts(graph, fromNodeId, port, toNodeId, 'in') : null;
}

export function disconnectLogicEdge(graph: LogicGraph, edgeId: string): LogicGraph {
  const kept = graph.edges.filter((edge) => edge.id !== edgeId);
  return kept.length === graph.edges.length ? graph : { ...graph, edges: kept };
}

export function removeConnection(
  graph: LogicGraph,
  fromNodeId: string,
  toNodeId: string,
): LogicGraph {
  const kept = graph.edges.filter(
    (edge) => !(edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId),
  );
  return kept.length === graph.edges.length ? graph : { ...graph, edges: kept };
}

export function appendAction(
  graph: LogicGraph,
  payload: ActionPayload = createDefaultActionPayload(),
): LogicGraph {
  const position = nextNodePosition(graph);
  const node: ActionNode = createActionNode(payload, position);
  const withNode = { ...graph, nodes: [...graph.nodes, node] };
  const chain = orderChain(graph);
  const tail = chain[chain.length - 1];
  if (!tail) {
    return withNode;
  }
  const port = firstFreeOutput(graph, tail);
  return port ? connectLogicPorts(withNode, tail.id, port, node.id) ?? withNode : withNode;
}

export function appendCondition(graph: LogicGraph): LogicGraph {
  const node = createConditionNode(nextNodePosition(graph));
  const withNode = { ...graph, nodes: [...graph.nodes, node] };
  const tail = orderChain(graph).at(-1);
  if (!tail) {
    return withNode;
  }
  const port = firstFreeOutput(graph, tail);
  return port ? connectLogicPorts(withNode, tail.id, port, node.id) ?? withNode : withNode;
}

export function addActionNode(
  graph: LogicGraph,
  payload: ActionPayload,
  position: LogicNodePosition,
  inputMappings?: ActionInputMappings,
  connectToTail = false,
): LogicGraph {
  const node = createActionNode(payload, position);
  const withNode: LogicGraph = {
    ...graph,
    nodes: [
      ...graph.nodes,
      inputMappings && Object.keys(inputMappings).length > 0
        ? { ...node, inputMappings: structuredClone(inputMappings) }
        : node,
    ],
  };
  if (!connectToTail) return withNode;
  const tail = orderChain(graph).at(-1);
  if (!tail) return withNode;
  const port = firstFreeOutput(graph, tail);
  return port ? connectLogicPorts(withNode, tail.id, port, node.id) ?? withNode : withNode;
}

export function addConditionNode(
  graph: LogicGraph,
  position: LogicNodePosition,
): LogicGraph {
  return { ...graph, nodes: [...graph.nodes, createConditionNode(position)] };
}

/** Repairs legacy/in-memory graphs before the n8n-style canvas renders them. */
export function normalizeLogicGraph(graph: LogicGraph, fallbackEvent: TriggerEvent): LogicGraph {
  let changed = false;
  let nodes = graph.nodes.map((node, index) => {
    const position = node.position;
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      changed = true;
      return { ...node, position: { x: 80 + index * 232, y: 160 } };
    }
    return node;
  });
  if (!nodes.some((node) => node.kind === 'trigger')) {
    changed = true;
    nodes = [
      createTriggerNode(fallbackEvent, { x: 80, y: 160 }),
      ...nodes.map((node) => ({
        ...node,
        position: { ...node.position, x: node.position.x + 232 },
      })),
    ];
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = graph.edges.map((edge, index) => {
    const legacy = edge as LogicEdge & Partial<LogicEdge>;
    const source = nodeById.get(edge.fromNodeId);
    const inferredKind = legacy.kind ?? (legacy.toPort && legacy.toPort !== 'in' ? 'resource' : 'control');
    const migratedPort = inferredKind === 'control' && source?.kind === 'action' && isAsyncActionPayload(source.payload) && (legacy.fromPort ?? 'next') === 'next'
      ? 'success'
      : legacy.fromPort ?? 'next';
    const needsResourceKind = inferredKind === 'resource' && legacy.kind !== 'resource';
    if (!legacy.id || !legacy.fromPort || !legacy.toPort || needsResourceKind || migratedPort !== legacy.fromPort) {
      changed = true;
      return {
        id: legacy.id ?? `edge_${graph.id}_${index + 1}`,
        fromNodeId: edge.fromNodeId,
        fromPort: migratedPort,
        toNodeId: edge.toNodeId,
        toPort: legacy.toPort ?? 'in',
        ...(inferredKind === 'resource' ? { kind: 'resource' as const } : {}),
      } satisfies LogicEdge;
    }
    return edge;
  });
  return changed ? { ...graph, nodes, edges } : graph;
}

export function updateAction(
  graph: LogicGraph,
  nodeId: string,
  payload: ActionPayload,
): LogicGraph {
  const target = graph.nodes.find((node) => node.id === nodeId);
  if (!target || target.kind !== 'action' || JSON.stringify(target.payload) === JSON.stringify(payload)) {
    return graph;
  }
  const nextNode = { ...target, payload };
  const wasAsync = isAsyncActionPayload(target.payload);
  const isAsync = isAsyncActionPayload(payload);
  const edges = wasAsync === isAsync
    ? graph.edges
    : graph.edges
        .filter((edge) => !(edge.kind !== 'resource' && edge.fromNodeId === nodeId && edge.fromPort === 'error' && !isAsync))
        .map((edge) => edge.fromNodeId !== nodeId || edge.kind === 'resource'
          ? edge
          : { ...edge, fromPort: isAsync ? 'success' as const : 'next' as const });
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.kind === 'action' && node.id === nodeId ? nextNode : node,
    ),
    edges,
  };
}

export function updateCondition(
  graph: LogicGraph,
  nodeId: string,
  patch: Partial<Pick<ConditionNode, 'left' | 'operator' | 'compareValue'>>,
): LogicGraph {
  const target = graph.nodes.find((node) => node.id === nodeId);
  if (!target || target.kind !== 'condition') {
    return graph;
  }
  const next = { ...target, ...patch };
  if (JSON.stringify(next) === JSON.stringify(target)) {
    return graph;
  }
  return { ...graph, nodes: graph.nodes.map((node) => (node.id === nodeId ? next : node)) };
}

export function moveLogicNode(
  graph: LogicGraph,
  nodeId: string,
  position: LogicNodePosition,
): LogicGraph {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || (node.position.x === position.x && node.position.y === position.y)) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((candidate) =>
      candidate.id === nodeId ? { ...candidate, position } : candidate,
    ),
  };
}

export function removeLogicNodes(
  graph: LogicGraph,
  removed: ReadonlySetLike<string>,
): LogicGraph {
  const keptNodes = graph.nodes.filter((node) => !removed.has(node.id));
  if (keptNodes.length === graph.nodes.length) {
    return graph;
  }
  const surviving = new Set(keptNodes.map((node) => node.id));
  return {
    ...graph,
    nodes: keptNodes,
    edges: graph.edges.filter(
      (edge) => surviving.has(edge.fromNodeId) && surviving.has(edge.toNodeId),
    ),
  };
}

export function wouldCreateCycle(
  graph: LogicGraph,
  fromNodeId: string,
  toNodeId: string,
): boolean {
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
  }
  const stack = [toNodeId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === fromNodeId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    stack.push(...(outgoing.get(current) ?? []));
  }
  return false;
}

export function outputPortsFor(node: LogicNode): readonly LogicOutputPort[] {
  if (node.kind === 'condition') return ['true', 'false'];
  if (node.kind === 'action' && isAsyncActionPayload(node.payload)) return ['success', 'error'];
  return ['next'];
}

export function resourceOutputPortsFor(node: LogicNode): readonly LogicResourcePort[] {
  if (node.kind !== 'action') return [];
  switch (node.payload.type) {
    case 'document-load': return ['documents'];
    case 'text-split': return ['text-splitter'];
    case 'embedding-generate': return ['embeddings'];
    case 'chat-model': return ['chat-model'];
    case 'memory': return ['memory'];
    case 'rerank': return ['reranker'];
    case 'prompt-template': return ['prompt-template'];
    case 'vector-store': return node.payload.operation === 'retrieve-tool' ? ['tool'] : [];
    default: return [];
  }
}

export function resourceInputPortsFor(node: LogicNode): readonly LogicResourcePort[] {
  if (node.kind !== 'action') return [];
  switch (node.payload.type) {
    case 'document-load': return ['text-splitter'];
    case 'vector-store':
      return node.payload.operation === 'upsert'
        ? ['documents', 'embeddings']
        : node.payload.operation === 'retrieve-tool'
          ? ['embeddings', 'reranker']
          : [];
    case 'ai-agent': return ['chat-model', 'memory', 'tool', 'prompt-template'];
    default: return [];
  }
}

export function isAsyncActionPayload(payload: ActionPayload): boolean {
  return payload.type === 'get-records' || payload.type === 'get-record' || payload.type === 'load-chart-data' ||
    payload.type === 'load-list-items' ||
    payload.type === 'insert-record' ||
    payload.type === 'update-record' ||
    payload.type === 'delete-record' ||
    payload.type === 'send-email' ||
    payload.type === 'document-load' ||
    payload.type === 'document-upload' ||
    payload.type === 'embedding-generate' ||
    payload.type === 'vector-upsert' ||
    payload.type === 'vector-delete' ||
    payload.type === 'query-embedding' ||
    payload.type === 'vector-retrieve' ||
    payload.type === 'rerank' ||
    payload.type === 'llm-generate' ||
    payload.type === 'memory' ||
    payload.type === 'vector-store' ||
    payload.type === 'ai-agent' ||
    payload.type === 'cv-liveness' ||
    payload.type === 'cv-enroll' ||
    payload.type === 'cv-verify';
}

function firstFreeOutput(graph: LogicGraph, node: LogicNode): LogicOutputPort | null {
  return outputPortsFor(node).find(
    (port) => !graph.edges.some((edge) => edge.fromNodeId === node.id && edge.fromPort === port),
  ) ?? null;
}

function nextNodePosition(graph: LogicGraph): LogicNodePosition {
  const maxX = graph.nodes.reduce((maximum, node) => Math.max(maximum, node.position.x), 80);
  return { x: maxX + 232, y: 160 };
}

function portOrder(port: LogicOutputPort): number {
  if (port === 'next') return 0;
  if (port === 'true' || port === 'success') return 1;
  return 2;
}
