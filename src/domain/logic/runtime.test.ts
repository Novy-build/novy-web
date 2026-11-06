import { describe, expect, it } from 'vitest';
import type { Screen } from '../entities/screen';
import { createActionNode, createBehaviorBundle } from '../factories/logic';
import { appendAction, appendCondition, connectLogicPorts, updateCondition } from './graph';
import { applyTextOverrides, pruneDeadNavigateTargets, runClickBehavior, type PreviewEffect } from './runtime';

const TARGET_TEXT_NODE = 'node_text';

function buildScreen(): { screen: Screen; graphId: string } {
  const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
  const screen: Screen = {
    id: 'screen_1',
    name: 'Home',
    nodes: [
      {
        id: TARGET_TEXT_NODE,
        type: 'text',
        x: 10,
        y: 10,
        w: 200,
        h: 30,
        props: { text: 'Hello, World!', level: 'display' },
      },
      {
        id: 'node_button',
        type: 'button',
        x: 10,
        y: 60,
        w: 140,
        h: 40,
        props: { label: 'Click me', variant: 'solid' },
      },
      {
        id: 'node_input',
        type: 'input',
        x: 10,
        y: 120,
        w: 200,
        h: 50,
        props: { label: 'Answer', placeholder: 'Type yes', inputType: 'text', multiline: false },
      },
    ],
    behaviors: [bundle.behavior],
    logicGraphs: [bundle.graph],
  };
  return { screen, graphId: bundle.graph.id };
}

describe('runClickBehavior', () => {
  it('executes the whole chain of the behavior bound to the clicked node', () => {
    const { screen, graphId } = buildScreen();

    const once = appendAction(screen.logicGraphs[0]!, {
      type: 'change-text',
      targetNodeId: TARGET_TEXT_NODE,
      text: 'Changed!',
    });
    const twice = appendAction(once, { type: 'show-message', message: 'Done' });
    const graph = twice;
    const screenWithGraph: Screen = {
      ...screen,
      logicGraphs: screen.logicGraphs.map((g) => (g.id === graphId ? graph : g)),
    };

    const effects = runClickBehavior({ screens: [screenWithGraph] }, screenWithGraph, 'node_button');

    expect(effects).toEqual([
      { kind: 'change-text', nodeId: TARGET_TEXT_NODE, text: 'Changed!' },
      { kind: 'show-message', message: 'Done' },
    ] satisfies PreviewEffect[]);
  });

  it('returns nothing when the component has no click behavior', () => {
    const { screen } = buildScreen();
    expect(runClickBehavior({ screens: [screen] }, screen, TARGET_TEXT_NODE)).toEqual([]);
  });

  it('skips unconfigured steps and dead navigation targets', () => {
    const { screen, graphId } = buildScreen();
    // appendAction default: change-text with empty target → no effect.
    const withEmpty = appendAction(screen.logicGraphs[0]!);
    const withDeadNav = appendAction(withEmpty, { type: 'navigate', targetScreenId: 'screen_ghost' });
    const screenWithGraph: Screen = {
      ...screen,
      logicGraphs: screen.logicGraphs.map((g) => (g.id === graphId ? withDeadNav : g)),
    };

    expect(runClickBehavior({ screens: [screenWithGraph] }, screenWithGraph, 'node_button')).toEqual([]);
  });

  it('executes true and false condition branches from preview component values', () => {
    const { screen, graphId } = buildScreen();
    let graph = appendCondition(screen.logicGraphs[0]!);
    const condition = graph.nodes[1]!;
    graph = updateCondition(graph, condition.id, {
      left: { source: 'component', nodeId: 'node_input', property: 'value' },
      operator: 'equals',
      compareValue: 'yes',
    });
    const yes = createActionNode({ type: 'show-message', message: 'Accepted' }, { x: 544, y: 100 });
    const no = createActionNode({ type: 'show-message', message: 'Try again' }, { x: 544, y: 260 });
    graph = { ...graph, nodes: [...graph.nodes, yes, no] };
    graph = connectLogicPorts(graph, condition.id, 'true', yes.id)!;
    graph = connectLogicPorts(graph, condition.id, 'false', no.id)!;
    const withGraph = { ...screen, logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item) };

    expect(runClickBehavior(
      { screens: [withGraph] },
      withGraph,
      'node_button',
      { componentValues: new Map([['node_input', 'yes']]) },
    )).toEqual([{ kind: 'show-message', message: 'Accepted' }]);
    expect(runClickBehavior(
      { screens: [withGraph] },
      withGraph,
      'node_button',
      { componentValues: new Map([['node_input', 'no']]) },
    )).toEqual([{ kind: 'show-message', message: 'Try again' }]);
  });

  it('emits repository-agnostic database effects for preview orchestration', () => {
    const { screen, graphId } = buildScreen();
    const graph = appendAction(screen.logicGraphs[0]!, {
      type: 'insert-record',
      collectionId: 'students',
      values: { name: 'Ada' },
    });
    const withGraph = { ...screen, logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item) };

    expect(runClickBehavior({ screens: [withGraph] }, withGraph, 'node_button')).toEqual([
      {
        kind: 'data-operation',
        payload: { type: 'insert-record', collectionId: 'students', values: { name: 'Ada' } },
      },
    ]);
  });
});

describe('applyTextOverrides', () => {
  it('rewrites the text of overridden nodes, reference-stable when no overrides', () => {
    const { screen } = buildScreen();

    const overridden = applyTextOverrides(screen, new Map([[TARGET_TEXT_NODE, 'See you!']]));
    const textNode = overridden.nodes[0]!;
    expect(textNode.type === 'text' ? textNode.props.text : undefined).toBe('See you!');

    expect(applyTextOverrides(screen, new Map())).toBe(screen);
  });
});

describe('pruneDeadNavigateTargets', () => {
  it('drops navigate steps that point at a deleted screen', () => {
    const { screen, graphId } = buildScreen();
    const withNav = appendAction(screen.logicGraphs[0]!, { type: 'navigate', targetScreenId: 'screen_9' });
    const pruned = pruneDeadNavigateTargets([withNav], 'screen_9');

    const graph = pruned[0];
    expect(graph.nodes.some((node) => node.kind === 'action' && node.payload.type === 'navigate')).toBe(false);
    expect(graph.id).toBe(graphId); // same graph, partially pruned
  });

  it('keeps graphs untouched when no step navigates to the dead screen', () => {
    const { screen } = buildScreen();
    const graphs = screen.logicGraphs;
    expect(pruneDeadNavigateTargets(graphs, 'screen_9')).toBe(graphs);
  });
});
