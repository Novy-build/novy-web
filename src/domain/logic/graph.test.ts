import { describe, expect, it } from 'vitest';
import { createBehaviorBundle, createActionNode, createDefaultActionPayload, createTriggerNode } from '../factories/logic';
import {
  addConnection,
  appendAction,
  appendCondition,
  connectLogicPorts,
  moveLogicNode,
  normalizeLogicGraph,
  orderChain,
  removeConnection,
  removeLogicNodes,
  updateAction,
} from './graph';

function buildGraph() {
  const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
  return { bundle, graph: bundle.graph };
}

describe('orderChain', () => {
  it('orders the trigger first and follows the chain through edges', () => {
    const { graph } = buildGraph();
    const chained = appendAction(graph, { type: 'show-message', message: 'Hi' });
    const chainedTwice = appendAction(chained, { type: 'navigate', targetScreenId: 'screen_2' });

    const order = orderChain(chainedTwice);
    expect(order).toHaveLength(3);
    expect(order[0]?.kind).toBe('trigger');
    expect(order[1] && order[1].kind === 'action' ? order[1].payload.type : undefined).toBe('show-message');
    expect(order[2] && order[2].kind === 'action' ? order[2].payload.type : undefined).toBe('navigate');
  });

  it('appends unreachable nodes after the chain instead of dropping them', () => {
    const { graph } = buildGraph();
    const orphan = createActionNode(createDefaultActionPayload());
    const withOrphan = {
      ...graph,
      nodes: [...graph.nodes, orphan],
    };

    const order = orderChain(withOrphan);
    expect(order).toHaveLength(2);
    expect(order[1]?.id).toBe(orphan.id);
  });
});

describe('addConnection', () => {
  it('links a trigger to an action and rejects self-links, duplicates, and trigger targets', () => {
    const { bundle, graph } = buildGraph();
    const action = createActionNode(createDefaultActionPayload());
    const populated = { ...graph, nodes: [...graph.nodes, action] };
    const triggerId = bundle.graph.nodes[0]!.id;

    const linked = addConnection(populated, triggerId, action.id);
    expect(linked).not.toBeNull();
    expect(linked!.edges).toHaveLength(1);

    expect(addConnection(populated, action.id, action.id)).toBeNull();
    expect(addConnection(populated, triggerId, triggerId)).toBeNull();
    expect(addConnection(linked!, triggerId, action.id)).toBeNull();
    expect(addConnection(linked!, action.id, triggerId)).toBeNull();
    expect(addConnection(populated, 'ghost', action.id)).toBeNull();
  });
});

describe('removeConnection / removeLogicNodes', () => {
  it('removes an edge and survives when nothing matched', () => {
    const { bundle, graph } = buildGraph();
    const action = createActionNode(createDefaultActionPayload());
    const triggerId = bundle.graph.nodes[0]!.id;
    const populated = {
      ...graph,
      nodes: [...graph.nodes, action],
      edges: [{ id: 'edge_test', fromNodeId: triggerId, fromPort: 'next' as const, toNodeId: action.id, toPort: 'in' as const }],
    };

    const removed = removeConnection(populated, triggerId, action.id);
    expect(removed.edges).toHaveLength(0);
    expect(removeConnection(populated, triggerId, 'ghost')).toBe(populated);
  });

  it('drops nodes plus their incident edges, reference-stable when empty', () => {
    const { graph } = buildGraph();
    const populated = appendAction(graph, { type: 'navigate', targetScreenId: 's2' });
    const appendedId = populated.nodes[1]?.id ?? '';

    const pruned = removeLogicNodes(populated, new Set([appendedId]));
    expect(pruned.nodes.some((node) => node.id === appendedId)).toBe(false);
    expect(pruned.edges.some((edge) => edge.toNodeId === appendedId)).toBe(false);

    expect(removeLogicNodes(populated, new Set(['ghost']))).toBe(populated);
  });
});

describe('appendAction', () => {
  it('wires the new step to the current chain tail', () => {
    const { graph } = buildGraph();
    const once = appendAction(graph, { type: 'show-message', message: 'A' });
    const twice = appendAction(once, { type: 'show-message', message: 'B' });

    const oldActionId = once.nodes[1]!.id;
    expect(twice.nodes).toHaveLength(3);
    expect(twice.edges).toEqual([
      expect.objectContaining({ fromNodeId: graph.nodes[0]?.id ?? '', fromPort: 'next', toNodeId: oldActionId, toPort: 'in' }),
      expect.objectContaining({ fromNodeId: oldActionId, fromPort: 'next', toNodeId: twice.nodes[2]?.id ?? '', toPort: 'in' }),
    ]);
  });

  it('uses the empty change-text default when called without a payload', () => {
    const { bundle, graph } = buildGraph();
    const moved = appendAction(graph);
    const node = moved.nodes[1]!;
    expect(node.kind === 'action' ? node.payload : undefined).toEqual({ type: 'change-text', targetNodeId: '', text: '' });
    expect(bundle.graph.nodes).toHaveLength(1); // source untouched
  });
});

describe('updateAction', () => {
  it('rewrites a step payload and stays reference-stable for identical values', () => {
    const { graph } = buildGraph();
    const withStep = appendAction(graph, { type: 'change-text', targetNodeId: '', text: '' });
    const stepId = withStep.nodes[1]?.id ?? '';

    const updated = updateAction(withStep, stepId, {
      type: 'change-text',
      targetNodeId: 'node_text',
      text: 'Changed!',
    });
    const step = updated.nodes.find((node) => node.id === stepId);
    expect(step && step.kind === 'action' ? step.payload : undefined).toEqual({
      type: 'change-text',
      targetNodeId: 'node_text',
      text: 'Changed!',
    });

    const sameAgain = updateAction(updated, stepId, {
      type: 'change-text',
      targetNodeId: 'node_text',
      text: 'Changed!',
    });
    expect(sameAgain).toBe(updated);
    expect(updateAction(withStep, 'ghost', { type: 'show-message', message: 'x' })).toBe(withStep);
  });
});

describe('factories', () => {
  it('builds the behavior and its trigger-only graph together', () => {
    const { behavior, graph } = createBehaviorBundle('On load — Screen', 'node_none', 'load');

    expect(behavior.graphId).toBe(graph.id);
    expect(behavior.targetNodeId).toBe('node_none');
    expect(behavior.event).toBe('load');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0] && graph.nodes[0].kind === 'trigger' ? graph.nodes[0].event : undefined).toBe('load');
    expect(graph.edges).toHaveLength(0);
  });

  it('prepares a distinct trigger node per event', () => {
    expect(createTriggerNode('change').event).toBe('change');
  });
});

describe('typed graph ports and conditions', () => {
  it('adds a positioned condition with true/false ports', () => {
    const { graph } = buildGraph();
    const withCondition = appendCondition(graph);
    const condition = withCondition.nodes[1]!;

    expect(condition).toMatchObject({
      kind: 'condition',
      position: { x: 312, y: 160 },
      operator: 'equals',
    });
    expect(withCondition.edges[0]).toMatchObject({
      fromNodeId: graph.nodes[0]!.id,
      fromPort: 'next',
      toNodeId: condition.id,
      toPort: 'in',
    });
  });

  it('repairs positionless or triggerless legacy graphs before rendering', () => {
    const action = createActionNode({ type: 'show-message', message: 'Legacy' });
    delete (action as unknown as { position?: { x: number; y: number } }).position;
    const legacy = {
      ...buildGraph().graph,
      nodes: [action],
      edges: [],
    };

    const normalized = normalizeLogicGraph(legacy, 'click');
    expect(normalized.nodes[0]).toMatchObject({ kind: 'trigger', event: 'click' });
    expect(normalized.nodes[1]).toMatchObject({
      kind: 'action',
      position: { x: 312, y: 160 },
    });
  });

  it('creates deterministic true/false branches and rejects occupied ports and cycles', () => {
    let graph = appendCondition(buildGraph().graph);
    const condition = graph.nodes[1]!;
    const yes = createActionNode({ type: 'show-message', message: 'Yes' }, { x: 544, y: 100 });
    const no = createActionNode({ type: 'show-message', message: 'No' }, { x: 544, y: 260 });
    graph = { ...graph, nodes: [...graph.nodes, yes, no] };

    const withTrue = connectLogicPorts(graph, condition.id, 'true', yes.id)!;
    const branched = connectLogicPorts(withTrue, condition.id, 'false', no.id)!;
    expect(branched.edges.filter((edge) => edge.fromNodeId === condition.id)).toHaveLength(2);
    expect(connectLogicPorts(branched, condition.id, 'true', no.id)).toBeNull();
    expect(connectLogicPorts(branched, yes.id, 'next', condition.id)).toBeNull();
  });

  it('persists free-form node positions reference-stably', () => {
    const graph = buildGraph().graph;
    const trigger = graph.nodes[0]!;
    const moved = moveLogicNode(graph, trigger.id, { x: 144, y: 88 });

    expect(moved.nodes[0]!.position).toEqual({ x: 144, y: 88 });
    expect(moveLogicNode(moved, trigger.id, { x: 144, y: 88 })).toBe(moved);
  });
});
