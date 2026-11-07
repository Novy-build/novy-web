import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useReducer } from 'react';
import type { ProjectDocument } from '@domain/entities/screen';
import type { DataCollection } from '@domain/entities/appData';
import { editorReducer } from '../state/editorReducer';
import { createEditorState, getActiveScreen, type EditorState } from '../state/editorState';
import { makeButton, makeScreen, makeText } from '@test/editorFixtures';
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
  fields: [{ id: 'student_name', key: 'name', label: 'Student name', type: 'text', required: true }],
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
  render(<Harness document={document} />);
  return screen.getByRole('region', { name: 'Logic workspace' });
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
    expect(screen.getByRole('button', { name: 'On click' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add condition' })).not.toBeInTheDocument();
  });

  it('adds and configures a Change Text node from the Nodes library', () => {
    renderWorkspace(seededWorkflow());
    fireEvent.click(screen.getByRole('button', { name: 'Change Text' }));

    const graph = getActiveScreen(latest.current!).logicGraphs[0]!;
    const action = graph.nodes.find((node) => node.kind === 'action')!;
    expect(graph.edges).toHaveLength(0); // explicit n8n-style wiring, no arbitrary auto-connect
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
    fireEvent.click(screen.getByRole('button', { name: 'On click' }));
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
    expect(screen.getByRole('button', { name: 'On click' })).toBeInTheDocument();
  });

  it('reconstructs a missing graph referenced by a saved workflow', () => {
    const broken = structuredClone(seededWorkflow());
    broken.screens[0]!.logicGraphs = [];
    renderWorkspace(broken);

    const repaired = getActiveScreen(latest.current!).logicGraphs[0]!;
    expect(repaired.id).toBe(getActiveScreen(latest.current!).behaviors[0]!.graphId);
    expect(repaired.nodes[0]).toMatchObject({ kind: 'trigger', event: 'click' });
    expect(screen.getByRole('button', { name: 'On click' })).toBeInTheDocument();
  });
});
