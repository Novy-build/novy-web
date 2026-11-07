import { describe, expect, it } from 'vitest';
import type { Screen } from '../entities/screen';
import type { LogicGraph } from '../entities/logic';
import { createActionNode, createBehaviorBundle } from '../factories/logic';
import { appendAction, appendCondition, connectLogicPorts, updateCondition } from './graph';
import {
  applyTextOverrides,
  pruneDeadNavigateTargets,
  resolveValueExpression,
  runBehavior,
  runClickBehavior,
  type PreviewEffect,
} from './runtime';

const TARGET_TEXT_NODE = 'node_text';

function buildScreen(): { screen: Screen; graphId: string } {
  const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
  const screen: Screen = {
    id: 'screen_1',
    name: 'Home',
    path: '/',
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

  it('maps component and session values into email inputs and follows the success port', () => {
    const { screen, graphId } = buildScreen();
    let graph = appendAction(screen.logicGraphs[0]!, {
      type: 'send-email',
      to: '',
      subject: '',
      body: 'Static body',
    });
    const email = graph.nodes[1]!;
    if (email.kind !== 'action') throw new Error('Expected action node');
    graph = {
      ...graph,
      nodes: graph.nodes.map((node) => node.id === email.id ? {
        ...email,
        inputMappings: {
          to: { source: 'session', path: 'user.email' },
          subject: { source: 'component', nodeId: TARGET_TEXT_NODE, property: 'text' },
        },
      } : node),
    };
    graph = appendAction(graph, { type: 'refresh-collection', collectionId: 'students' });
    const withGraph = {
      ...screen,
      logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item),
    };

    expect(runClickBehavior(
      { screens: [withGraph] },
      withGraph,
      'node_button',
      {
        componentValues: new Map(),
        session: { user: { email: 'ada@example.com' } },
      },
    )).toEqual([
      { kind: 'email-simulated', to: 'ada@example.com', subject: 'Hello, World!' },
      { kind: 'refresh-collection', collectionId: 'students' },
    ]);
  });

  it('executes change and load bindings through the generic runtime', () => {
    const { screen } = buildScreen();
    const bundle = createBehaviorBundle('On change — Answer', 'node_input', 'change');
    const graph = appendAction(bundle.graph, { type: 'show-message', message: 'Changed' });
    const changed = { ...screen, behaviors: [bundle.behavior], logicGraphs: [graph] };

    expect(runBehavior({ screens: [changed] }, changed, 'node_input', 'change')).toEqual([
      { kind: 'show-message', message: 'Changed' },
    ]);
    expect(runBehavior({ screens: [changed] }, changed, 'node_input', 'load')).toEqual([]);
  });

  it('maps captured media into biometric verification and exposes a simulated result', () => {
    const { screen, graphId } = buildScreen();
    let graph = appendAction(screen.logicGraphs[0]!, {
      type: 'cv-verify',
      mediaReference: '',
      userId: 'preview-user',
      threshold: 0.9,
    });
    const verify = graph.nodes[1]!;
    if (verify.kind !== 'action') throw new Error('Expected action node');
    graph = {
      ...graph,
      nodes: graph.nodes.map((node) => node.id === verify.id ? {
        ...verify,
        inputMappings: {
          mediaReference: { source: 'component', nodeId: 'node_input', property: 'value' },
        },
      } : node),
    };
    graph = appendAction(graph, { type: 'show-message', message: 'Unlocked' });
    const withGraph = {
      ...screen,
      logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item),
    };

    expect(runClickBehavior(
      { screens: [withGraph] },
      withGraph,
      'node_button',
      { componentValues: new Map([['node_input', 'data:image/jpeg;base64,preview']]) },
    )).toEqual([
      {
        kind: 'cv-result',
        operation: 'verify',
        verified: true,
        credentialId: undefined,
        reason: 'simulated',
      },
      { kind: 'show-message', message: 'Unlocked' },
    ]);
  });

  it('passes structured outputs through a granular retrieval and generation chain', () => {
    const { screen, graphId } = buildScreen();
    let graph = appendAction(screen.logicGraphs[0]!, {
      type: 'chat-input',
      componentId: 'node_input',
      staticQuestion: '',
    });
    const chatInput = graph.nodes[1]!;
    graph = appendAction(graph, {
      type: 'document-load',
      source: 'inline',
      sourceReference: '',
      documentId: 'note-1',
      title: 'First note',
      text: 'Ada wrote about analytical engines.',
      metadata: {},
    });
    const loader = graph.nodes[2]!;
    graph = appendAction(graph, {
      type: 'prompt-template',
      template: 'Context: {context}\nQuestion: {question}',
      contextSeparator: '\n',
      emptyContextBehavior: 'return-empty',
    });
    const prompt = graph.nodes[3]!;
    graph = appendAction(graph, {
      type: 'llm-generate',
      connectionProfileId: 'preview-llm',
      model: 'preview',
      systemPrompt: '',
      temperature: 0.2,
      maxTokens: 200,
    });
    const llm = graph.nodes[4]!;
    graph = appendAction(graph, { type: 'chat-output', targetNodeId: TARGET_TEXT_NODE });
    const output = graph.nodes[5]!;
    if (chatInput.kind !== 'action' || loader.kind !== 'action' || prompt.kind !== 'action' || llm.kind !== 'action' || output.kind !== 'action') throw new Error('Expected action chain');
    graph = {
      ...graph,
      purpose: 'chat',
      nodes: graph.nodes.map((node) => {
        if (node.id === prompt.id) return { ...prompt, inputMappings: {
          question: { source: 'node-output', nodeId: chatInput.id, path: 'question' },
          matches: { source: 'node-output', nodeId: loader.id, path: 'documents' },
        } };
        if (node.id === llm.id) return { ...llm, inputMappings: {
          prompt: { source: 'node-output', nodeId: prompt.id, path: 'prompt' },
          matches: { source: 'node-output', nodeId: loader.id, path: 'documents' },
        } };
        if (node.id === output.id) return { ...output, inputMappings: {
          answer: { source: 'node-output', nodeId: llm.id, path: 'answer' },
          citations: { source: 'node-output', nodeId: llm.id, path: 'citations' },
        } };
        return node;
      }),
    };
    const withGraph = { ...screen, logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item) };

    expect(runClickBehavior(
      { screens: [withGraph] },
      withGraph,
      'node_button',
      { componentValues: new Map([['node_input', 'What did Ada write about?']]) },
    )).toEqual([{
      kind: 'chat-response',
      nodeId: TARGET_TEXT_NODE,
      answer: 'Simulated answer based on the compiled prompt.',
      citations: [{
        documentId: 'note-1',
        title: 'First note',
        snippet: 'Ada wrote about analytical engines.',
        score: 0,
      }],
    }]);
  });

  it('executes an Agent with attached model, memory, and vector-store tool resources', () => {
    const { screen, graphId } = buildScreen();
    const trigger = screen.logicGraphs[0]!.nodes[0]!;
    const input = createActionNode({ type: 'chat-input', componentId: 'node_input', staticQuestion: '' }, { x: 312, y: 160 });
    const agent = createActionNode({ type: 'ai-agent', instructions: 'Use the notes tool.', maxIterations: 4, returnIntermediateSteps: false }, { x: 544, y: 160 });
    const output = createActionNode({ type: 'chat-output', targetNodeId: TARGET_TEXT_NODE }, { x: 776, y: 160 });
    output.inputMappings = {
      answer: { source: 'node-output', nodeId: agent.id, path: 'answer' },
      citations: { source: 'node-output', nodeId: agent.id, path: 'citations' },
    };
    const model = createActionNode({ type: 'chat-model', connectionProfileId: 'chat-profile', model: 'chat-model', temperature: 0.2, maxTokens: 400 }, { x: 420, y: 360 });
    const memory = createActionNode({ type: 'memory', operation: 'load', connectionProfileId: '', scope: 'session', windowSize: 10 }, { x: 600, y: 360 });
    const tool = createActionNode({ type: 'vector-store', operation: 'retrieve-tool', connectionProfileId: 'vector-profile', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 }, { x: 780, y: 360 });
    const embedding = createActionNode({ type: 'embedding-generate', connectionProfileId: 'embed-profile', model: 'embed-model', batchSize: 32 }, { x: 780, y: 500 });
    let graph: LogicGraph = { ...screen.logicGraphs[0]!, purpose: 'chat', nodes: [trigger, input, agent, output, model, memory, tool, embedding], edges: [] };
    graph = connectLogicPorts(graph, trigger.id, 'next', input.id)!;
    graph = connectLogicPorts(graph, input.id, 'next', agent.id)!;
    graph = connectLogicPorts(graph, agent.id, 'success', output.id)!;
    graph = connectLogicPorts(graph, model.id, 'chat-model', agent.id, 'chat-model')!;
    graph = connectLogicPorts(graph, memory.id, 'memory', agent.id, 'memory')!;
    graph = connectLogicPorts(graph, tool.id, 'tool', agent.id, 'tool')!;
    graph = connectLogicPorts(graph, embedding.id, 'embeddings', tool.id, 'embeddings')!;
    const withGraph = { ...screen, logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item) };

    expect(runClickBehavior(
      { screens: [withGraph] }, withGraph, 'node_button', {
        componentValues: new Map([['node_input', 'What is in my note?']]),
        data: {
          getRecord: () => null,
          vectorRetrieve: () => [{ id: 'chunk-1', documentId: 'note-1', title: 'Note', text: 'Relevant note text', score: 0.9 }],
        },
      },
    )).toEqual([{
      kind: 'chat-response',
      nodeId: TARGET_TEXT_NODE,
      answer: 'Simulated agent answer based on the attached vector-store tool.',
      citations: [{ documentId: 'note-1', title: 'Note', snippet: 'Relevant note text', score: 0.9 }],
    }]);
  });

  it('indexes a newly created record through attached loader, splitter, and embedding resources', () => {
    const { screen, graphId } = buildScreen();
    const trigger = screen.logicGraphs[0]!.nodes[0]!;
    const insert = createActionNode({ type: 'insert-record', collectionId: 'notes', values: { title: 'First', content: 'A note about engines.' } }, { x: 312, y: 160 });
    const vectorStore = createActionNode({ type: 'vector-store', operation: 'upsert', connectionProfileId: 'vector', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 }, { x: 544, y: 160 });
    const loader = createActionNode({ type: 'document-load', source: 'previous-output', sourceReference: '', documentId: '', title: '', text: '', metadata: {} }, { x: 480, y: 360 });
    const splitter = createActionNode({ type: 'text-split', strategy: 'recursive-character', chunkSize: 12, chunkOverlap: 2, separators: [] }, { x: 280, y: 500 });
    const embedding = createActionNode({ type: 'embedding-generate', connectionProfileId: 'embedding', model: 'model', batchSize: 32 }, { x: 680, y: 360 });
    let graph: LogicGraph = { ...screen.logicGraphs[0]!, purpose: 'ingestion', nodes: [trigger, insert, vectorStore, loader, splitter, embedding], edges: [] };
    graph = connectLogicPorts(graph, trigger.id, 'next', insert.id)!;
    graph = connectLogicPorts(graph, insert.id, 'success', vectorStore.id)!;
    graph = connectLogicPorts(graph, loader.id, 'documents', vectorStore.id, 'documents')!;
    graph = connectLogicPorts(graph, splitter.id, 'text-splitter', loader.id, 'text-splitter')!;
    graph = connectLogicPorts(graph, embedding.id, 'embeddings', vectorStore.id, 'embeddings')!;
    const withGraph = { ...screen, logicGraphs: screen.logicGraphs.map((item) => item.id === graphId ? graph : item) };

    expect(runClickBehavior({ screens: [withGraph] }, withGraph, 'node_button')).toEqual([
      { kind: 'data-operation', payload: { type: 'insert-record', collectionId: 'notes', values: { title: 'First', content: 'A note about engines.' } } },
      { kind: 'vector-indexed', insertedCount: 2 },
    ]);
  });
});

describe('resolveValueExpression', () => {
  it('resolves literals and nested previous-node output paths', () => {
    const { screen } = buildScreen();
    const document = { screens: [screen] };
    const context = {
      componentValues: new Map<string, string>(),
      nodeOutputs: new Map<string, unknown>([['action_1', { result: { id: 42 } }]]),
    };

    expect(resolveValueExpression({ source: 'literal', value: 'fixed' }, document, context)).toBe('fixed');
    expect(resolveValueExpression(
      { source: 'node-output', nodeId: 'action_1', path: 'result.id' },
      document,
      context,
    )).toBe(42);
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
