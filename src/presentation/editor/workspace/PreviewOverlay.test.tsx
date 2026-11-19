import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreviewEffect } from '@domain/logic/runtime';
import type { Screen } from '@domain/entities/screen';
import { createActionNode, createBehaviorBundle } from '@domain/factories/logic';
import { appendAction, appendCondition, connectLogicPorts, updateCondition } from '@domain/logic/graph';
import { makeButton, makeColumn, makeListView, makeScreen, makeText } from '@test/editorFixtures';
import type { DataCollection, DataRecord } from '@domain/entities/appData';
import { createPadding, type ChatNode } from '@domain/entities/componentNode';
import { createProjectFromTemplate } from '@domain/factories/screen';
import { RAG_CHAT_TEMPLATE } from '@data/templates/ragChatTemplate';
import { PreviewOverlay } from './PreviewOverlay';
import type { RuntimePreviewRepository } from '@domain/repositories/runtimePreview.repository';

beforeEach(() => {
  window.localStorage.clear();
});

/** Home + About, where clicking "Click me" runs the given extra chain steps. */
function buildScreens(steps: PreviewEffect[]): Screen[] {
  const home = makeScreen('screen_home', [
    makeText('node_text', { x: 24, y: 24, w: 200, h: 36 }),
    makeButton('node_button', { x: 24, y: 80, w: 160, h: 44 }),
  ]);
  const about = makeScreen(
    'screen_about',
    [makeText('node_arrival', { x: 24, y: 200, w: 200, h: 24, props: { text: 'You made it!', level: 'body' } })],
    'About',
  );
  const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
  const payloadFor = (effect: PreviewEffect) => {
    switch (effect.kind) {
      case 'change-text':
        return { type: 'change-text' as const, targetNodeId: effect.nodeId, text: effect.text };
      case 'show-message':
        return { type: 'show-message' as const, message: effect.message };
      case 'navigate':
        return { type: 'navigate' as const, targetScreenId: effect.screenId };
    }
  };
  const graph = steps.reduce(
    (current, effect) => appendAction(current, payloadFor(effect)),
    bundle.graph,
  );

  return [
    { ...home, behaviors: [{ ...bundle.behavior, graphId: graph.id }], logicGraphs: [graph] },
    about,
  ];
}

function renderPreview(onClose = vi.fn(), screens: Screen[] = buildScreens([])) {
  render(<PreviewOverlay initialDevice="mobile" onClose={onClose} projectName="My App" screens={screens} />);
  return onClose;
}

function buildChatScreen(): Screen {
  const chat: ChatNode = {
    id: 'chat_document',
    type: 'chat',
    x: 20,
    y: 20,
    w: 350,
    h: 600,
    props: {
      title: 'Ask your document',
      placeholder: 'Ask a question',
      sendLabel: 'Send',
      emptyText: 'Ask your first question.',
      showCitations: true,
    },
  };
  const base = makeScreen('screen_chat', [chat]);
  const bundle = createBehaviorBundle('On change — Ask document', chat.id, 'change');
  let graph = appendAction(bundle.graph, {
    type: 'chat-message',
    targetNodeId: chat.id,
    role: 'user',
    text: '',
  });
  graph = appendAction(graph, {
    type: 'ai-agent',
    instructions: 'Answer from the indexed document.',
    maxIterations: 2,
    returnIntermediateSteps: false,
  });
  graph = appendAction(graph, {
    type: 'chat-message',
    targetNodeId: chat.id,
    role: 'assistant',
    text: '',
  });
  const actions = graph.nodes.filter((node) => node.kind === 'action');
  const userMessage = actions[0]!;
  const agent = actions[1]!;
  const assistantMessage = actions[2]!;
  graph = {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id === userMessage.id && node.kind === 'action') {
        return {
          ...node,
          inputMappings: {
            text: { source: 'component' as const, nodeId: chat.id, property: 'value' as const },
          },
        };
      }
      if (node.id === agent.id && node.kind === 'action') {
        return {
          ...node,
          inputMappings: {
            question: { source: 'component' as const, nodeId: chat.id, property: 'value' as const },
          },
        };
      }
      if (node.id === assistantMessage.id && node.kind === 'action') {
        return {
          ...node,
          inputMappings: {
            text: { source: 'node-output' as const, nodeId: agent.id, path: 'answer' },
          },
        };
      }
      return node;
    }),
  };
  return {
    ...base,
    behaviors: [bundle.behavior],
    logicGraphs: [graph],
  };
}

describe('PreviewOverlay', () => {
  it('keeps assistant drafts sandbox-only even if persistence and backend services are supplied', async () => {
    const runtimePreview: RuntimePreviewRepository = {
      isAvailable: true, prepare: vi.fn(), resetData: vi.fn(), execute: vi.fn(),
      uploadDocument: vi.fn(), executeVision: vi.fn(), requestCode: vi.fn(), verifyCode: vi.fn(),
      getSession: vi.fn(), logout: vi.fn(),
    };
    const persistence = { createRecord: vi.fn(), updateRecord: vi.fn(), deleteRecord: vi.fn() };
    const screens = buildScreens([{ kind: 'show-message', message: 'Local workflow works' }]);
    render(<PreviewOverlay
      onClose={vi.fn()}
      persistence={persistence}
      projectName="Draft"
      runtimeManifest={{ manifestVersion: 2, project: { id: 'project' } }}
      runtimePreview={runtimePreview}
      sandboxOnly
      screens={screens}
    />);
    expect(screen.queryByRole('button', { name: 'Run App' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Save data changes')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Local workflow works');
    expect(runtimePreview.prepare).not.toHaveBeenCalled();
    expect(runtimePreview.execute).not.toHaveBeenCalled();
    expect(persistence.createRecord).not.toHaveBeenCalled();
  });

  it('offers a simple theme selector and applies Set Theme logic locally', async () => {
    const button = makeButton('theme_button');
    const home = makeScreen('theme_home', [button]);
    const bundle = createBehaviorBundle('On click — Theme', button.id, 'click');
    const graph = appendAction(bundle.graph, { type: 'set-theme', theme: 'dark' });
    renderPreview(vi.fn(), [{ ...home, behaviors: [bundle.behavior], logicGraphs: [graph] }]);

    const selector = screen.getByRole('combobox', { name: 'App theme' });
    expect(selector).toHaveValue('system');
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));

    await waitFor(() => expect(selector).toHaveValue('dark'));
    expect(document.querySelector('.novy-app-theme-dark')).not.toBeNull();
  });

  it('starts and stops a real runtime preview explicitly', async () => {
    const prepare = vi.fn<RuntimePreviewRepository['prepare']>().mockResolvedValue({ appId: 'app_preview' });
    const resetData = vi.fn<RuntimePreviewRepository['resetData']>().mockResolvedValue(2);
    const manifest = { manifestVersion: 2, project: { id: 'project_1' } };
    const runtimePreview: RuntimePreviewRepository = {
      isAvailable: true,
      prepare,
      resetData,
      execute: vi.fn(),
      uploadDocument: vi.fn(),
      executeVision: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      getSession: vi.fn(async () => null),
      logout: vi.fn(),
    };
    render(
      <PreviewOverlay
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="My App"
        runtimeManifest={manifest}
        runtimePreview={runtimePreview}
        screens={buildScreens([])}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run App' }));

    await waitFor(() => expect(prepare).toHaveBeenCalledWith(manifest));
    expect(await screen.findByText('Real runtime')).toBeInTheDocument();
    expect(screen.getByText(/CRUD uses a resettable preview-data sandbox/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset preview data' }));
    await waitFor(() => expect(resetData).toHaveBeenCalledWith('project_1'));
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.queryByText('Real runtime')).not.toBeInTheDocument();
  });

  it('signs a generated-app user into Run App with an emailed code', async () => {
    const requestCode = vi.fn<RuntimePreviewRepository['requestCode']>();
    const verifyCode = vi.fn<RuntimePreviewRepository['verifyCode']>().mockResolvedValue({
      id: 'runtime_user',
      email: 'owner@example.com',
      isAnonymous: false,
    });
    const runtimePreview: RuntimePreviewRepository = {
      isAvailable: true,
      prepare: vi.fn(async () => ({ appId: 'app_preview' })),
      resetData: vi.fn(async () => 0),
      execute: vi.fn(),
      uploadDocument: vi.fn(),
      executeVision: vi.fn(),
      requestCode,
      verifyCode,
      getSession: vi.fn(async () => null),
      logout: vi.fn(),
    };
    render(
      <PreviewOverlay
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="My App"
        runtimeManifest={{ manifestVersion: 2 }}
        runtimePreview={runtimePreview}
        screens={buildScreens([])}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run App' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in to app' }));
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }));

    await waitFor(() => expect(requestCode).toHaveBeenCalledWith('app_preview', 'owner@example.com'));
    fireEvent.change(await screen.findByLabelText('Six-digit code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(verifyCode).toHaveBeenCalledWith(
      'app_preview',
      'owner@example.com',
      '123456',
    ));
    expect(await screen.findByText('Signed in: owner@example.com')).toBeInTheDocument();
  });

  it('renders a submitted chat message and thinking bubble before the RAG response', async () => {
    let resolveAgent!: (value: Record<string, unknown>) => void;
    const agentResponse = new Promise<Record<string, unknown>>((resolve) => {
      resolveAgent = resolve;
    });
    const execute = vi.fn<RuntimePreviewRepository['execute']>().mockReturnValue(agentResponse);
    const runtimePreview: RuntimePreviewRepository = {
      isAvailable: true,
      prepare: vi.fn(async () => ({ appId: 'app_preview' })),
      resetData: vi.fn(async () => 0),
      execute,
      uploadDocument: vi.fn(),
      executeVision: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      getSession: vi.fn(async () => null),
      logout: vi.fn(),
    };
    render(
      <PreviewOverlay
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Chat App"
        runtimeManifest={{ manifestVersion: 2 }}
        runtimePreview={runtimePreview}
        screens={[buildChatScreen()]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run App' }));
    await screen.findByText('Real runtime');
    fireEvent.change(screen.getByLabelText('Ask a question'), {
      target: { value: 'What is the source about?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('What is the source about?')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Assistant is thinking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(execute).toHaveBeenCalledWith(
      'app_preview',
      expect.any(String),
      expect.objectContaining({ type: 'ai-agent' }),
      expect.objectContaining({ question: 'What is the source about?' }),
    );

    await act(async () => {
      resolveAgent({ answer: 'It is about memory management.', citations: [] });
      await agentResponse;
    });

    expect(await screen.findByText('It is about memory management.')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Assistant is thinking' })).not.toBeInTheDocument();
    expect(screen.getAllByText('What is the source about?')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('keeps the submitted chat message and clears thinking when RAG fails', async () => {
    let rejectAgent!: (reason: Error) => void;
    const agentResponse = new Promise<Record<string, unknown>>((_resolve, reject) => {
      rejectAgent = reject;
    });
    const runtimePreview: RuntimePreviewRepository = {
      isAvailable: true,
      prepare: vi.fn(async () => ({ appId: 'app_preview' })),
      resetData: vi.fn(async () => 0),
      execute: vi.fn(() => agentResponse),
      uploadDocument: vi.fn(),
      executeVision: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      getSession: vi.fn(async () => null),
      logout: vi.fn(),
    };
    render(
      <PreviewOverlay
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Chat App"
        runtimeManifest={{ manifestVersion: 2 }}
        runtimePreview={runtimePreview}
        screens={[buildChatScreen()]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run App' }));
    await screen.findByText('Real runtime');
    fireEvent.change(screen.getByLabelText('Ask a question'), {
      target: { value: 'Will this stay visible?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Will this stay visible?')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Assistant is thinking' })).toBeInTheDocument();

    await act(async () => {
      rejectAgent(new Error('The RAG provider is unavailable.'));
      await agentResponse.catch(() => undefined);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('The RAG provider is unavailable.');
    expect(screen.getAllByText('Will this stay visible?')).toHaveLength(1);
    expect(screen.queryByRole('status', { name: 'Assistant is thinking' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('runs the document template upload, indexing, and chat navigation chain', async () => {
    const uploadDocument = vi.fn<RuntimePreviewRepository['uploadDocument']>().mockResolvedValue({
      sourceId: 'source_document',
      filename: 'handbook.txt',
      mediaType: 'text/plain',
    });
    const execute = vi.fn<RuntimePreviewRepository['execute']>().mockResolvedValue({
      insertedCount: 1,
      updatedCount: 0,
      chunkCount: 1,
    });
    const runtimePreview: RuntimePreviewRepository = {
      isAvailable: true,
      prepare: vi.fn(async () => ({ appId: 'app_preview' })),
      resetData: vi.fn(async () => 0),
      execute,
      uploadDocument,
      executeVision: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      getSession: vi.fn(async () => null),
      logout: vi.fn(),
    };
    const project = createProjectFromTemplate(
      RAG_CHAT_TEMPLATE,
      'Chat with a document',
      new Date('2026-11-17T00:00:00Z'),
    );
    render(
      <PreviewOverlay
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName={project.name}
        runtimeManifest={{ manifestVersion: 2 }}
        runtimePreview={runtimePreview}
        screens={project.document.screens}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run App' }));
    await screen.findByText('Real runtime');

    fireEvent.change(screen.getByLabelText('Choose a document'), {
      target: { files: [new File(['Alpha handbook content'], 'handbook.txt', { type: 'text/plain' })] },
    });

    expect(await screen.findByText('Ask your document')).toBeInTheDocument();
    expect(uploadDocument).toHaveBeenCalledWith(
      'app_preview',
      'rag_demo_action_upload',
      expect.objectContaining({ mediaReference: 'media:handbook.txt' }),
      expect.any(File),
    );
    expect(execute).toHaveBeenCalledWith(
      'app_preview',
      'rag_demo_action_store',
      expect.objectContaining({ type: 'vector-store', operation: 'upsert' }),
      expect.objectContaining({
        $previous: expect.objectContaining({ sourceId: 'source_document' }),
      }),
    );
  });

  it('previews the first screen at full size', () => {
    renderPreview();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Previewing My App' })).toBeInTheDocument();
    expect(within(dialog).getByText(/390×780/)).toBeInTheDocument();
    expect(within(dialog).getByText('Hello, World!')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = renderPreview();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('provides a visible close control', () => {
    const onClose = renderPreview();

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs click chains step by step: text change, then toast', async () => {
    vi.useFakeTimers();
    try {
      renderPreview(
        vi.fn(),
        buildScreens([
          { kind: 'change-text', nodeId: 'node_text', text: 'Changed!' },
          { kind: 'show-message', message: 'Saved!' },
        ]),
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Click me' }));
      await act(async () => { await Promise.resolve(); });

      expect(within(dialog).getByText('Changed!')).toBeInTheDocument();
      expect(screen.getByTestId('preview-toast')).toHaveTextContent('Saved!');

      // The toast self-dismisses after its runtime window; the text stays.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2400);
      });
      expect(screen.queryByTestId('preview-toast')).not.toBeInTheDocument();
      expect(within(dialog).getByText('Changed!')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('navigates to the target screen and resets runtime overrides', async () => {
    renderPreview(
      vi.fn(),
      buildScreens([
        { kind: 'change-text', nodeId: 'node_text', text: 'Changed!' },
        { kind: 'navigate', screenId: 'screen_about' },
      ]),
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Click me' }));

    expect(await within(dialog).findByText('You made it!')).toBeInTheDocument();
    expect(within(dialog).queryByText('Changed!')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Click me' })).not.toBeInTheDocument();
  });

  it('does not run chains for components without a bound behavior', () => {
    renderPreview(vi.fn(), [makeScreen('screen_home', [makeButton('node_button')])]);

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));

    expect(screen.queryByTestId('preview-toast')).not.toBeInTheDocument();
  });

  it('announces the behavior events that execute in the preview', () => {
    renderPreview();

    expect(within(screen.getByRole('dialog')).getByText(/Click, change, and screen-load behaviors/)).toBeInTheDocument();
  });

  it('runs change behaviors with the updated preview value', async () => {
    const home = makeScreen('screen_home', [
      {
        id: 'node_input',
        type: 'input',
        x: 24,
        y: 24,
        w: 220,
        h: 56,
        props: { label: 'Answer', placeholder: 'Type', inputType: 'text', multiline: false },
      },
    ]);
    const bundle = createBehaviorBundle('On change — Answer', 'node_input', 'change');
    const graph = appendAction(bundle.graph, { type: 'show-message', message: 'Value changed' });
    renderPreview(vi.fn(), [{ ...home, behaviors: [bundle.behavior], logicGraphs: [graph] }]);

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'yes' } });
    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Value changed');
  });

  it('runs screen-load behaviors when a screen is entered', async () => {
    const home = makeScreen('screen_home', [makeText('node_text')]);
    const bundle = createBehaviorBundle('On load — Home', 'node_text', 'load');
    const graph = appendAction(bundle.graph, { type: 'show-message', message: 'Screen loaded' });
    renderPreview(vi.fn(), [{ ...home, behaviors: [bundle.behavior], logicGraphs: [graph] }]);

    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Screen loaded');
  });

  it('captures preview input values and follows condition branches', async () => {
    const home = makeScreen('screen_home', [
      {
        id: 'node_input',
        type: 'input',
        x: 24,
        y: 24,
        w: 220,
        h: 56,
        props: { label: 'Answer', placeholder: 'yes or no', inputType: 'text', multiline: false },
      },
      makeButton('node_button', { x: 24, y: 100 }),
    ]);
    const bundle = createBehaviorBundle('On click — Click me', 'node_button', 'click');
    let graph = appendCondition(bundle.graph);
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
    const screenWithLogic = {
      ...home,
      behaviors: [bundle.behavior],
      logicGraphs: [graph],
    };
    renderPreview(vi.fn(), [screenWithLogic]);

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'yes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    await waitFor(() => expect(screen.getByTestId('preview-toast')).toHaveTextContent('Accepted'));

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'no' } });
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    await waitFor(() => expect(screen.getByTestId('preview-toast')).toHaveTextContent('Try again'));
  });

  it('keeps composed input records in isolated preview data and refreshes bound ListViews', async () => {
    const collection: DataCollection = {
      id: 'students',
      projectId: 'project',
      databaseId: 'database',
      name: 'Students',
      fields: [
        { id: 'name', key: 'name', label: 'Name', type: 'text', required: true },
        { id: 'email', key: 'email', label: 'Email', type: 'text', required: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const list = makeListView('listview', {
      props: {
        emptyText: 'No students yet',
        showDividers: true,
        scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch',
        gap: 0,
        padding: createPadding(0),
        itemSpacing: 0,
        itemBorderRadius: 0,
        dataSource: { kind: 'collection', collectionId: 'students', displayFieldIds: ['name'] },
      },
      children: [makeText('student_item', { props: { text: 'Student', level: 'body' }, bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'name' } }] })],
      y: 400,
    });
    const nameInput = {
      id: 'student_name', type: 'input' as const, x: 0, y: 0, w: 288, h: 44,
      props: { label: 'Name', placeholder: 'Name', inputType: 'text' as const, multiline: false },
    };
    const emailInput = {
      id: 'student_email', type: 'input' as const, x: 0, y: 0, w: 288, h: 44,
      props: { label: 'Email', placeholder: 'Email', inputType: 'email' as const, multiline: false },
    };
    const submit = makeButton('student_submit', { x: 0, y: 0, w: 288, props: { label: 'Create student', variant: 'solid' } });
    const column = makeColumn('student_form', [nameInput, emailInput, submit]);
    const bundle = createBehaviorBundle('Create student', submit.id, 'click');
    const graphWithInsert = appendAction(bundle.graph, {
      type: 'insert-record', collectionId: 'students', values: { name: '', email: '' },
    });
    const graph = {
      ...graphWithInsert,
      nodes: graphWithInsert.nodes.map((node) => node.kind === 'action'
        ? {
            ...node,
            inputMappings: {
              name: { source: 'component' as const, nodeId: nameInput.id, property: 'value' as const },
              email: { source: 'component' as const, nodeId: emailInput.id, property: 'value' as const },
            },
          }
        : node),
    };
    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Students"
        recordsByCollection={new Map([['students', []]])}
        screens={[{
          ...makeScreen('home', [column, list]),
          behaviors: [bundle.behavior],
          logicGraphs: [graph],
        }]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Preview record inserted.');
    expect(await screen.findByText('Ada')).toBeInTheDocument();
  });

  it('applies database-node effects to isolated preview records', async () => {
    const collection: DataCollection = {
      id: 'students', projectId: 'project', databaseId: 'database', name: 'Students',
      fields: [{ id: 'name', key: 'name', label: 'Name', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const button = makeButton('button', { x: 24, y: 24 });
    const list = makeListView('listview', {
      y: 100,
      props: {
        emptyText: 'No students yet', showDividers: true, scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 0, itemBorderRadius: 0,
        dataSource: { kind: 'collection', collectionId: 'students', displayFieldIds: ['name'] },
      },
      children: [makeText('student_item', { props: { text: 'Student', level: 'body' }, bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'name' } }] })],
    });
    const base = makeScreen('home', [button, list]);
    const bundle = createBehaviorBundle('On click — Click me', 'button', 'click');
    const graph = appendAction(bundle.graph, {
      type: 'insert-record', collectionId: 'students', values: { name: 'Grace Hopper' },
    });
    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Students"
        recordsByCollection={new Map([['students', []]])}
        screens={[{ ...base, behaviors: [bundle.behavior], logicGraphs: [graph] }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Preview record inserted.');
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
  });

  it('reads a record without removing it from preview collection state', async () => {
    const collection: DataCollection = {
      id: 'students', projectId: 'project', databaseId: 'database', name: 'Students',
      fields: [{ id: 'name', key: 'name', label: 'Name', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const record: DataRecord = {
      id: 'student_1', projectId: 'project', collectionId: collection.id,
      values: { name: 'Ada' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const button = makeButton('load', { props: { label: 'Load', variant: 'solid' } });
    const list = makeListView('listview', {
      y: 100,
      props: {
        emptyText: 'No students yet', showDividers: true, scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 0, itemBorderRadius: 0,
        dataSource: { kind: 'collection', collectionId: collection.id, displayFieldIds: ['name'] },
      },
      children: [makeText('student_item', { bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'name' } }] })],
    });
    const bundle = createBehaviorBundle('Load student', button.id, 'click');
    const graph = appendAction(bundle.graph, {
      type: 'get-record', collectionId: collection.id, recordId: record.id,
    });

    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Students"
        recordsByCollection={new Map([[collection.id, [record]]])}
        screens={[{ ...makeScreen('home', [button, list]), behaviors: [bundle.behavior], logicGraphs: [graph] }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('persists inserts only after the user enables project-data writes', async () => {
    const collection: DataCollection = {
      id: 'notes', projectId: 'project', databaseId: 'database', name: 'Notes',
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const button = makeButton('save', { props: { label: 'Save', variant: 'solid' } });
    const bundle = createBehaviorBundle('Save note', button.id, 'click');
    const graph = appendAction(bundle.graph, {
      type: 'insert-record', collectionId: collection.id, values: { title: 'Persistent note' },
    });
    const created = {
      id: 'record_1', projectId: 'project', collectionId: collection.id,
      values: { title: 'Persistent note' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const createRecord = vi.fn().mockResolvedValue(created);

    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        persistence={{ createRecord, updateRecord: vi.fn(), deleteRecord: vi.fn() }}
        projectName="Notes"
        recordsByCollection={new Map([[collection.id, []]])}
        screens={[{ ...makeScreen('home', [button]), behaviors: [bundle.behavior], logicGraphs: [graph] }]}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Save data changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(createRecord).toHaveBeenCalledWith(collection.id, { title: 'Persistent note' }));
    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Record saved to project data.');
    expect(screen.getByText(/Database actions create, update, and delete/)).toBeInTheDocument();
  });

  it('does not follow the success path when insert validation fails', async () => {
    const collection: DataCollection = {
      id: 'notes', projectId: 'project', databaseId: 'database', name: 'Notes',
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const button = makeButton('save', { props: { label: 'Save', variant: 'solid' } });
    const home = makeScreen('home', [button]);
    const destination = makeScreen('destination', [makeText('arrival', { props: { text: 'Home destination', level: 'body' } })]);
    const bundle = createBehaviorBundle('Save note', button.id, 'click');
    const insert = appendAction(bundle.graph, {
      type: 'insert-record', collectionId: collection.id, values: { title: '' },
    });
    const graph = appendAction(insert, { type: 'navigate', targetScreenId: destination.id });

    render(
      <PreviewOverlay
        collections={[collection]}
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Notes"
        recordsByCollection={new Map([[collection.id, []]])}
        screens={[{ ...home, behaviors: [bundle.behavior], logicGraphs: [graph] }, destination]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Title is required.');
    expect(screen.queryByText('Home destination')).not.toBeInTheDocument();
  });

  it('prepends session-only items without replacing static ListView seeds', async () => {
    const button = makeButton('button', { x: 24, y: 24 });
    const list = makeListView('drafts', { y: 100 });
    const base = makeScreen('home', [button, list]);
    const bundle = createBehaviorBundle('Add draft', button.id, 'click');
    const graph = appendAction(bundle.graph, {
      type: 'add-local-list-item',
      targetNodeId: list.id,
      placement: 'prepend',
      values: { value: 'Unsaved draft' },
    });
    render(
      <PreviewOverlay
        initialDevice="mobile"
        onClose={vi.fn()}
        projectName="Drafts"
        screens={[{ ...base, behaviors: [bundle.behavior], logicGraphs: [graph] }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));

    expect(await screen.findByTestId('preview-toast')).toHaveTextContent('Local list item added');
    const items = within(screen.getByRole('list', { name: 'ListView' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Unsaved draft', 'First', 'Second']);
  });
});

describe('PreviewOverlay zoom', () => {
  it('zooms in and out from the toolbar controls', () => {
    render(<PreviewOverlay initialDevice="mobile" onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    const dialog = screen.getByRole('dialog');
    const readPercent = () =>
      Number((within(dialog).getByTestId('preview-zoom-value').textContent ?? '0%').replace('%', ''));
    const initial = readPercent();

    fireEvent.click(within(dialog).getByLabelText('Zoom in preview'));
    expect(readPercent()).toBe(initial + 25);

    fireEvent.click(within(dialog).getByLabelText('Zoom out preview'));
    expect(readPercent()).toBe(initial);
  });

  it('fits the preview back to the stage', () => {
    render(<PreviewOverlay initialDevice="mobile" onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    const dialog = screen.getByRole('dialog');
    const readPercent = () =>
      Number((within(dialog).getByTestId('preview-zoom-value').textContent ?? '0%').replace('%', ''));
    const initial = readPercent();

    fireEvent.click(within(dialog).getByLabelText('Zoom in preview'));
    expect(readPercent()).toBe(initial + 25);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Fit' }));
    expect(readPercent()).toBe(initial);
  });

  it('opens on the requested screen', () => {
    const screens = buildScreens([]);
    const second = makeScreen('screen_second', [makeText('node_second', { props: { text: 'Second screen', level: 'body' } })], 'Second');
    render(
      <PreviewOverlay
        initialDevice="mobile"
        initialScreenId="screen_second"
        onClose={vi.fn()}
        projectName="My App"
        screens={[...screens, second]}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Second screen')).toBeInTheDocument();
    expect(within(dialog).queryByText('Hello, World!')).not.toBeInTheDocument();
  });
});

describe('PreviewOverlay device modes', () => {
  it('opens at desktop by default', () => {
    render(<PreviewOverlay onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    expect(screen.getByText(/1200×800/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches preview device independently', () => {
    render(<PreviewOverlay initialDevice="desktop" onClose={vi.fn()} projectName="My App" screens={buildScreens([])} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));

    expect(screen.getByText(/390×780/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'false');
  });
});
