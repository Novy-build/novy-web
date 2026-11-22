import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useReducer } from 'react';
import type { ProjectDocument } from '@domain/entities/screen';
import type { DataCollection } from '@domain/entities/appData';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { editorReducer } from '../state/editorReducer';
import { createEditorState, getActiveScreen, type EditorState } from '../state/editorState';
import { makeButton, makeListView, makeScreen, makeText } from '@test/editorFixtures';
import { LogicWorkspace } from './LogicWorkspace';

const SCREEN = makeScreen('screen_home', [
  makeText('node_text', { x: 24, y: 24, w: 220, h: 36 }),
  makeButton('node_button', { x: 24, y: 560, w: 160, h: 44 }),
]);
const DOCUMENT: ProjectDocument = { screens: [SCREEN] };
const COLLECTION: DataCollection = {
  id: 'students',
  projectId: 'project',
  databaseId: 'database',
  name: 'Students',
  fields: [
    { id: 'student_name', key: 'name', label: 'Student name', type: 'text', required: true },
    { id: 'completed', key: 'completed', label: 'Completed', type: 'boolean', required: false },
  ],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};
const latest: { current: EditorState | null } = { current: null };

function Harness({ document }: { document: ProjectDocument }) {
  const [state, dispatch] = useReducer(editorReducer, document, createEditorState);
  latest.current = state;
  return <LogicWorkspace collections={[COLLECTION]} state={state} dispatch={dispatch} />;
}

function renderWorkspace(document: ProjectDocument = DOCUMENT) {
  render(
    <RepositoriesProvider repositories={createStubRepositories()}>
      <Harness document={document} />
    </RepositoriesProvider>,
  );
  return screen.getByRole('region', { name: 'Logic workspace' });
}

function withListLoader(source: ReturnType<typeof makeScreen>, listId: string): typeof source {
  return {
    ...source,
    behaviors: [{
      id: 'load_students_behavior', name: 'Load students', event: 'load',
      graphId: 'load_students_graph', targetNodeId: listId,
    }],
    logicGraphs: [{
      id: 'load_students_graph', name: 'Load students', sourceNodeId: listId,
      nodes: [
        { kind: 'trigger', id: 'load_students_trigger', event: 'load', position: { x: 80, y: 160 } },
        {
          kind: 'action', id: 'load_students_action', position: { x: 312, y: 160 },
          payload: {
            type: 'load-list-items', targetNodeId: listId, collectionId: 'students',
            fields: [
              { id: 'student_name', label: 'Student name', type: 'text' },
              { id: 'completed', label: 'Completed', type: 'boolean' },
            ],
          },
        },
      ],
      edges: [{ id: 'load_students_edge', fromNodeId: 'load_students_trigger', fromPort: 'next', toNodeId: 'load_students_action', toPort: 'in' }],
    }],
  };
}

function seededWorkflow(): ProjectDocument {
  let state = createEditorState(DOCUMENT);
  state = editorReducer(state, {
    type: 'behavior/create',
    targetNodeId: 'node_button',
    event: 'click',
  });
  return state.document;
}

beforeEach(() => {
  latest.current = null;
  window.localStorage.clear();
});

describe('LogicWorkspace without a workflow', () => {
  it('derives component triggers and current-record actions from a collection ListView', () => {
    const list = makeListView('student_list');
    list.props.dataSource = { kind: 'static', fields: [{ id: 'student_name', label: 'Student name', type: 'text' }], items: [] };
    list.children = [makeButton('check_student', {
      name: 'Complete student',
      x: 0,
      y: 0,
      props: { label: 'Check', variant: 'solid' },
    })];
    const document: ProjectDocument = { screens: [withListLoader(makeScreen('screen_students', [list]), 'student_list')] };
    renderWorkspace(document);

    fireEvent.click(screen.getByRole('button', { name: 'Complete student · Button' }));
    const active = getActiveScreen(latest.current!);
    const behavior = active.behaviors.find((candidate) => candidate.targetNodeId === 'check_student' && candidate.event === 'click');
    expect(behavior).toMatchObject({ targetNodeId: 'check_student', event: 'click' });

    fireEvent.click(screen.getByRole('button', { name: 'Update current Student' }));
    const graph = getActiveScreen(latest.current!).logicGraphs.find((candidate) => candidate.id === behavior?.graphId)!;
    const update = graph.nodes.find((node) => node.kind === 'action' && node.payload.type === 'update-record');
    expect(update).toMatchObject({
      inputMappings: { '$recordId': { source: 'list-item', fieldId: '$id' } },
      payload: { collectionId: 'students', recordId: '' },
    });
    expect(graph.edges).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Update current item' }));
    expect(screen.getByText('Current Student selected automatically')).toBeInTheDocument();
    expect(screen.queryByLabelText('Record ID')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Completed'), { target: { value: 'true' } });
    const configured = getActiveScreen(latest.current!).logicGraphs
      .flatMap((candidate) => candidate.nodes)
      .find((node) => node.kind === 'action' && node.payload.type === 'update-record');
    expect(configured?.kind === 'action' && configured.payload.type === 'update-record'
      ? configured.payload.values.completed
      : null).toBe('true');
  });

  it('maps Open current item into an explicit generated detail route', () => {
    const list = makeListView('student_list');
    list.props.dataSource = { kind: 'static', fields: [{ id: 'student_name', label: 'Student name', type: 'text' }], items: [] };
    list.children = [makeButton('student_card', { name: 'Student card' })];
    const source = withListLoader(makeScreen('screen_students', [list], 'Students'), 'student_list');
    const detail = makeScreen('screen_student_detail', [makeText('student_name')], 'Student detail');
    detail.path = '/students/detail';
    renderWorkspace({ screens: [source, detail] });

    fireEvent.click(screen.getByRole('button', { name: 'Student card · Button' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open current Student' }));
    const action = getActiveScreen(latest.current!).logicGraphs
      .flatMap((graph) => graph.nodes)
      .find((node) => node.kind === 'action' && node.payload.type === 'navigate');
    if (!action) throw new Error('Open current item action was not created');
    fireEvent.click(screen.getByTestId(`logic-node-${action.id}`));
    const historyBeforeTarget = latest.current!.past.length;
    fireEvent.change(screen.getByLabelText('Target screen'), { target: { value: detail.id } });

    expect(latest.current!.past).toHaveLength(historyBeforeTarget + 1);
    const routed = latest.current!.document.screens.find((candidate) => candidate.id === detail.id)!;
    expect(routed).toMatchObject({
      path: '/students/detail/:studentId',
      routeParameters: [{
        name: 'studentId',
        source: { kind: 'record-id', collectionId: 'students', identifierKey: 'studentId' },
      }],
    });
    expect(screen.getByText('Route:')).toHaveTextContent('/students/detail/:studentId');
    expect(screen.getByText(/studentId: Current item ID/)).toBeInTheDocument();
  });

  it('explains when a record-aware target has no record route', () => {
    const list = makeListView('student_list');
    list.props.dataSource = { kind: 'static', fields: [{ id: 'student_name', label: 'Student name', type: 'text' }], items: [] };
    list.children = [makeButton('student_card', { name: 'Student card' })];
    const source = withListLoader(makeScreen('screen_students', [list], 'Students'), 'student_list');
    const home = makeScreen('screen_home', [makeText('home_text')], 'Home');
    renderWorkspace({ screens: [source, home] });

    fireEvent.click(screen.getByRole('button', { name: 'Student card · Button' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open current Student' }));
    const action = getActiveScreen(latest.current!).logicGraphs
      .flatMap((graph) => graph.nodes)
      .find((node) => node.kind === 'action' && node.payload.type === 'navigate');
    if (!action) throw new Error('Open current item action was not created');
    fireEvent.click(screen.getByTestId(`logic-node-${action.id}`));
    fireEvent.change(screen.getByLabelText('Target screen'), { target: { value: home.id } });

    expect(screen.getByText(/no record ID route yet/i)).toBeInTheDocument();
    expect(latest.current!.document.screens.find((candidate) => candidate.id === home.id)?.path).toBe('/');
  });

  it('independently minimizes and restores the Nodes and Details panels', () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse nodes panel' }));
    expect(screen.queryByRole('complementary', { name: 'Logic nodes' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse details panel' }));
    expect(screen.queryByText('Select a step in the graph to configure it.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand nodes panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand details panel' }));
    expect(screen.getByRole('complementary', { name: 'Logic nodes' })).toBeInTheDocument();
    expect(screen.getByText('Select a step in the graph to configure it.')).toBeInTheDocument();
  });

  it('shows the Nodes library and dotted canvas without the old empty-state card', () => {
    renderWorkspace();

    expect(screen.getByRole('complementary', { name: 'Logic nodes' })).toBeInTheDocument();
    expect(screen.getByTestId('logic-stage')).toBeInTheDocument();
    expect(screen.getByText('Add a trigger node from Nodes to start a workflow.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Logic' })).not.toBeInTheDocument();
    expect(screen.queryByText(/No behaviors/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New behavior' })).not.toBeInTheDocument();
  });

  it('requires a trigger before adding flow or operation nodes', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'If / Else' }));

    expect(screen.getByRole('status')).toHaveTextContent(/Add an On Click, On Change, or On Load trigger first/);
    expect(getActiveScreen(latest.current!).behaviors).toHaveLength(0);
  });

  it('creates and configures a workflow directly from an On Click trigger node', () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'On Click' }));

    let active = getActiveScreen(latest.current!);
    expect(active.behaviors).toHaveLength(1);
    expect(active.logicGraphs[0]!.nodes[0]).toMatchObject({ kind: 'trigger', event: 'click' });
    expect(screen.getByRole('tab', { name: 'On click workflow', selected: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'On click' }));
    fireEvent.change(screen.getByLabelText('Target component'), { target: { value: 'node_button' } });

    active = getActiveScreen(latest.current!);
    expect(active.behaviors[0]).toMatchObject({
      targetNodeId: 'node_button',
      name: 'On click — Click me',
    });
    expect(screen.getByRole('tab', { name: 'On click — Click me', selected: true })).toBeInTheDocument();
  });

  it('searches the n8n-style node catalog including database nodes', () => {
    renderWorkspace();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search nodes' }), {
      target: { value: 'database' },
    });

    expect(screen.getByRole('button', { name: 'Database' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert to DB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete from DB' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change Text' })).not.toBeInTheDocument();
  });

  it('finds Send Email and Refresh Collection actions', () => {
    renderWorkspace();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search nodes' }), {
      target: { value: 'email' },
    });
    expect(screen.getByRole('button', { name: 'Send Email' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search nodes' }), {
      target: { value: 'refresh' },
    });
    expect(screen.getByRole('button', { name: 'Refresh Collection' })).toBeInTheDocument();
  });
});

describe('LogicWorkspace with a workflow', () => {
  it('shows the workflow trigger and no generic Action/Condition add toolbar', () => {
    renderWorkspace(seededWorkflow());

    expect(screen.getByRole('tab', { name: 'On click — Click me', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'When “Click me” is clicked' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add condition' })).not.toBeInTheDocument();
  });

  it('adds and configures a Change Text node from the Nodes library', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'Change Text' }));

    const graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const action = graph.nodes.find((node) => node.kind === 'action')!;
    expect(graph.edges).toHaveLength(1); // clicking a library action extends the readable flow automatically
    fireEvent.click(screen.getByTestId(`logic-node-${action.id}`));
    fireEvent.change(screen.getByLabelText('Target component'), { target: { value: 'node_text' } });
    fireEvent.change(screen.getByLabelText('New text'), { target: { value: 'Updated' } });

    const updated = getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find((node) => node.id === action.id);
    expect(updated?.kind === 'action' ? updated.payload : null).toEqual({
      type: 'change-text',
      targetNodeId: 'node_text',
      text: 'Updated',
    });
  });

  it('adds If / Else with true and false ports', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'If / Else' }));

    const condition = getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find(
      (node) => node.kind === 'condition',
    )!;
    fireEvent.click(screen.getByTestId(`logic-node-${condition.id}`));
    expect(screen.getByRole('heading', { name: 'If / Else' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'true output of If / Else' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'false output of If / Else' })).toBeInTheDocument();
  });

  it('adds named database operation nodes and configures their collection', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'Insert to DB' }));

    const graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const insert = graph.nodes.find(
      (node) => node.kind === 'action' && node.payload.type === 'insert-record',
    )!;
    fireEvent.click(screen.getByTestId(`logic-node-${insert.id}`));
    fireEvent.change(screen.getByLabelText('Collection'), { target: { value: 'students' } });
    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'Ada' } });

    const updated = getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find((node) => node.id === insert.id);
    expect(updated?.kind === 'action' ? updated.payload : null).toMatchObject({
      type: 'insert-record',
      collectionId: 'students',
      values: { student_name: 'Ada' },
    });
  });

  it('configures Get Record, a variable, and a component prefill without editing JSON', () => {
    const document = seededWorkflow();
    document.screens[0]!.nodes.push({
      id: 'note_title', type: 'input', x: 0, y: 120, w: 200, h: 44,
      props: { label: 'Title', placeholder: '', inputType: 'text', multiline: false },
    });
    renderWorkspace(document);
    fireEvent.click(screen.getByRole('button', { name: 'Get Record' }));
    let graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const getRecord = graph.nodes.find((node) => node.kind === 'action' && node.payload.type === 'get-record')!;
    fireEvent.click(screen.getByTestId(`logic-node-${getRecord.id}`));
    fireEvent.change(screen.getByLabelText('Collection'), { target: { value: 'students' } });
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'variable' } });
    fireEvent.change(screen.getByLabelText('Record ID variable name'), { target: { value: 'selectedId' } });

    fireEvent.click(screen.getByRole('button', { name: 'Set Variable' }));
    graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const variable = graph.nodes.find((node) => node.kind === 'action' && node.payload.type === 'set-variable')!;
    fireEvent.click(screen.getByTestId(`logic-node-${variable.id}`));
    fireEvent.change(screen.getByLabelText('Variable name'), { target: { value: 'mode' } });
    fireEvent.change(screen.getByLabelText('Default value'), { target: { value: 'edit' } });

    fireEvent.click(screen.getByRole('button', { name: 'Set Component Value' }));
    graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const prefill = graph.nodes.find((node) => node.kind === 'action' && node.payload.type === 'set-component-value')!;
    fireEvent.click(screen.getByTestId(`logic-node-${prefill.id}`));
    fireEvent.change(screen.getByLabelText('Target component'), { target: { value: 'note_title' } });
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'node-output' } });
    fireEvent.change(screen.getByLabelText('Component value node output source'), { target: { value: getRecord.id } });
    fireEvent.change(screen.getByLabelText('Component value record field'), { target: { value: 'record.values.student_name' } });

    graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    expect(graph.nodes.find((node) => node.id === getRecord.id)).toMatchObject({ payload: { collectionId: 'students' }, inputMappings: { '$recordId': { source: 'variable', name: 'selectedId' } } });
    expect(graph.nodes.find((node) => node.id === variable.id)).toMatchObject({ payload: { name: 'mode', value: 'edit' } });
    expect(graph.nodes.find((node) => node.id === prefill.id)).toMatchObject({ payload: { targetNodeId: 'note_title' }, inputMappings: { value: { source: 'node-output', nodeId: getRecord.id, path: 'record.values.student_name' } } });
  });

  it('allows conditions to compare an application variable', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'If / Else' }));
    const condition = getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find((node) => node.kind === 'condition')!;
    fireEvent.click(screen.getByTestId(`logic-node-${condition.id}`));
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'variable' } });
    fireEvent.change(screen.getByLabelText('Variable name'), { target: { value: 'mode' } });
    expect(getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find((node) => node.id === condition.id)).toMatchObject({ left: { source: 'variable', name: 'mode' } });
  });

  it('configures typed values and placement for a static ListView only', () => {
    const document = seededWorkflow();
    const list = makeListView('local_list');
    list.name = 'Draft items';
    if (list.props.dataSource.kind === 'static') {
      list.props.dataSource.fields = [
        { id: 'value', label: 'Title', type: 'text' },
        { id: 'priority', label: 'Priority', type: 'number' },
      ];
    }
    document.screens[0]!.nodes.push(list);
    renderWorkspace(document);
    fireEvent.click(screen.getByRole('button', { name: 'Add Local List Item' }));

    const graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const action = graph.nodes.find(
      (node) => node.kind === 'action' && node.payload.type === 'add-local-list-item',
    )!;
    fireEvent.click(screen.getByTestId(`logic-node-${action.id}`));
    expect(screen.getByText(/does not save to a collection or modify Project JSON/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Static ListView'), { target: { value: 'local_list' } });
    fireEvent.change(screen.getByLabelText('Placement'), { target: { value: 'prepend' } });
    fireEvent.change(screen.getAllByLabelText('Title')[0]!, { target: { value: 'Draft note' } });
    fireEvent.change(screen.getAllByLabelText('Priority')[0]!, { target: { value: '3' } });

    const updated = getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find((node) => node.id === action.id);
    expect(updated?.kind === 'action' ? updated.payload : null).toEqual({
      type: 'add-local-list-item',
      targetNodeId: 'local_list',
      placement: 'prepend',
      values: { value: 'Draft note', priority: 3 },
    });
    expect(screen.getByRole('button', { name: 'next output of Add local list item' })).toBeInTheDocument();
  });

  it('configures Send Email, dynamic inputs, and success/error ports', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'Send Email' }));

    const graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const email = graph.nodes.find(
      (node) => node.kind === 'action' && node.payload.type === 'send-email',
    )!;
    fireEvent.click(screen.getByTestId(`logic-node-${email.id}`));
    fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Welcome' } });
    fireEvent.change(screen.getAllByLabelText('Value source')[0]!, { target: { value: 'session' } });

    const updated = getActiveScreen(latest.current!).logicGraphs[0]!.nodes.find((node) => node.id === email.id);
    expect(updated?.kind === 'action' ? updated.payload : null).toMatchObject({
      type: 'send-email',
      to: 'ada@example.com',
      subject: 'Welcome',
    });
    expect(updated?.kind === 'action' ? updated.inputMappings : null).toEqual({
      to: { source: 'session', path: 'user.email' },
    });
    expect(screen.getByRole('button', { name: 'success output of Send email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'error output of Send email' })).toBeInTheDocument();
  });

  it('configures the trigger and deletes the workflow from Details', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'When “Click me” is clicked' }));
    expect(screen.getByText('Runs when Click me is clicked.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'change' } });
    expect(getActiveScreen(latest.current!).behaviors[0]!.event).toBe('change');

    fireEvent.click(screen.getByRole('button', { name: 'Delete workflow' }));
    expect(getActiveScreen(latest.current!).behaviors).toHaveLength(0);
    expect(screen.getByText('Add a trigger node from Nodes to start a workflow.')).toBeInTheDocument();
  });

  it('repairs a legacy positionless graph so nodes remain visible', () => {
    const legacy = structuredClone(seededWorkflow());
    const node = legacy.screens[0]!.logicGraphs[0]!.nodes[0]!;
    delete (node as unknown as { position?: { x: number; y: number } }).position;
    renderWorkspace(legacy);

    expect(getActiveScreen(latest.current!).logicGraphs[0]!.nodes[0]!.position).toEqual({ x: 80, y: 160 });
    expect(screen.getByRole('button', { name: 'When “Click me” is clicked' })).toBeInTheDocument();
  });

  it('reconstructs a missing graph referenced by a saved workflow', () => {
    const broken = structuredClone(seededWorkflow());
    broken.screens[0]!.logicGraphs = [];
    renderWorkspace(broken);

    const repaired = getActiveScreen(latest.current!).logicGraphs[0]!;
    expect(repaired.id).toBe(getActiveScreen(latest.current!).behaviors[0]!.graphId);
    expect(repaired.nodes[0]).toMatchObject({ kind: 'trigger', event: 'click' });
    expect(screen.getByRole('button', { name: 'When “Click me” is clicked' })).toBeInTheDocument();
  });
});
