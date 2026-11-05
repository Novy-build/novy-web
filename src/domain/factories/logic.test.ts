import { describe, expect, it } from 'vitest';
import { createBehavior, createLogicGraph, createShowMessageAction } from './logic';

describe('createLogicGraph', () => {
  it('builds a default trigger-only graph', () => {
    const graph = createLogicGraph({ name: 'On click', sourceNodeId: 'node_1', event: 'click' });

    expect(graph.id).toMatch(/^graph_/);
    expect(graph.name).toBe('On click');
    expect(graph.sourceNodeId).toBe('node_1');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({ kind: 'trigger', event: 'click' });
    expect(graph.edges).toEqual([]);
  });

  it('wires an optional starter action to the trigger', () => {
    const action = createShowMessageAction('You clicked me!');
    const graph = createLogicGraph({
      name: 'Greet',
      sourceNodeId: 'node_1',
      event: 'click',
      starterAction: action,
    });

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[1]).toMatchObject({ kind: 'action', payload: { type: 'show-message', message: 'You clicked me!' } });
    expect(graph.edges).toEqual([
      { fromNodeId: graph.nodes[0].id, toNodeId: action.id },
    ]);
  });
});

describe('createBehavior', () => {
  it('binds an event to a graph on a target component', () => {
    const behavior = createBehavior('Show message', 'click', 'graph_1', 'node_1');

    expect(behavior).toEqual({
      id: expect.stringMatching(/^behavior_/),
      name: 'Show message',
      event: 'click',
      graphId: 'graph_1',
      targetNodeId: 'node_1',
    });
  });
});
