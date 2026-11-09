import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageAppDataRepository } from '@data/repositories/local/LocalStorageAppDataRepository';
import type { DataCollection, DataRecord, DataValue } from '@domain/entities/appData';
import type { ComponentNode } from '@domain/entities/componentNode';
import { createPadding } from '@domain/entities/componentNode';
import type { ActionInputMappings, ActionPayload, LogicGraph, LogicNode, LogicOutputPort, TriggerEvent } from '@domain/entities/logic';
import { CURRENT_ITEM_ID_FIELD } from '@domain/entities/logic';
import { createActionNode, createBehaviorBundle, createConditionNode } from '@domain/factories/logic';
import { connectLogicPorts } from '@domain/logic/graph';
import { validateProject } from '@domain/validation/projectValidation';
import { makeButton, makeListView, makeScreen, makeText } from '@test/editorFixtures';
import { PreviewOverlay, type PreviewPersistenceActions } from './PreviewOverlay';

const PROJECT_ID = 'notes_project';
const POSITION = { x: 0, y: 0 };

function action(payload: ActionPayload, inputMappings?: ActionInputMappings) {
  return { ...createActionNode(payload, POSITION), inputMappings };
}

function workflow(
  targetNodeId: string,
  event: TriggerEvent,
  nodes: LogicNode[],
  connections: Array<[string, LogicOutputPort, string]>,
) {
  const bundle = createBehaviorBundle(`Test ${event}`, targetNodeId, event);
  const triggerId = bundle.graph.nodes[0]!.id;
  let graph: LogicGraph = { ...bundle.graph, nodes: [...bundle.graph.nodes, ...nodes] };
  for (const [from, port, to] of connections) {
    graph = connectLogicPorts(graph, from === 'trigger' ? triggerId : from, port, to)!;
  }
  return { behavior: bundle.behavior, graph };
}

function input(id: string, label: string, y: number): ComponentNode {
  return { id, type: 'input', x: 24, y, w: 280, h: 48, props: { label, placeholder: label, inputType: 'text', multiline: false } };
}

function notesScreens(collection: DataCollection) {
  const title = makeText('card_title', { props: { text: 'Title', level: 'title' }, bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'title_field' } }] });
  const description = makeText('card_desc', { props: { text: 'Description', level: 'body' }, bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'desc_field' } }] });
  const column: ComponentNode = {
    id: 'card_column', type: 'column', x: 0, y: 0, w: 250, h: 80,
    appearance: { backgroundColor: '#eeeeee', dark: { backgroundColor: '#222222' } },
    props: { mainAxisAlignment: 'start', crossAxisAlignment: 'stretch', gap: 2, padding: createPadding(0) },
    children: [title, description],
  };
  const menu: ComponentNode = {
    id: 'note_actions', type: 'dropdown', x: 260, y: 0, w: 44, h: 44,
    props: { label: 'Note actions', placeholder: '', options: ['Edit', 'Delete'], selectedIndex: -1, presentation: 'menu' },
  };
  const list = makeListView('notes_list', {
    y: 120,
    props: { emptyText: 'No notes yet', showDividers: false, scrollDirection: 'vertical', crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 8, itemBorderRadius: 8,
      dataSource: { kind: 'collection', collectionId: collection.id, displayFieldIds: ['title_field'] } },
    children: [column, menu],
  });
  const add = makeButton('add_note', { props: { label: 'Add note', variant: 'solid' } });
  const theme: ComponentNode = { id: 'theme', type: 'switch', x: 24, y: 60, w: 200, h: 44, props: { label: 'Dark mode', checked: false, controlsTheme: true } };
  const openAdd = action({ type: 'navigate', targetScreenId: 'add' });
  const addFlow = workflow(add.id, 'click', [openAdd], [['trigger', 'next', openAdd.id]]);

  const choice = { ...createConditionNode(POSITION), left: { source: 'component' as const, nodeId: menu.id, property: 'value' as const }, operator: 'equals' as const, compareValue: 'Edit' };
  const setId = action({ type: 'set-variable', name: 'selectedId', value: '' }, { value: { source: 'list-item', fieldId: CURRENT_ITEM_ID_FIELD } });
  const openEdit = action({ type: 'navigate', targetScreenId: 'edit' });
  const remove = action({ type: 'delete-record', collectionId: collection.id, recordId: '', confirm: true }, { '$recordId': { source: 'list-item', fieldId: CURRENT_ITEM_ID_FIELD } });
  const menuFlow = workflow(menu.id, 'change', [choice, setId, openEdit, remove], [
    ['trigger', 'next', choice.id], [choice.id, 'true', setId.id], [setId.id, 'next', openEdit.id], [choice.id, 'false', remove.id],
  ]);

  const insert = action({ type: 'insert-record', collectionId: collection.id, values: {} }, {
    title_field: { source: 'component', nodeId: 'new_title', property: 'value' },
    desc_field: { source: 'component', nodeId: 'new_desc', property: 'value' },
  });
  const afterInsert = action({ type: 'navigate', targetScreenId: 'home' });
  const insertFlow = workflow('create_save', 'click', [insert, afterInsert], [['trigger', 'next', insert.id], [insert.id, 'success', afterInsert.id]]);

  const load = action({ type: 'get-record', collectionId: collection.id, recordId: '' }, { '$recordId': { source: 'variable', name: 'selectedId' } });
  const setTitle = action({ type: 'set-component-value', targetNodeId: 'edit_title', value: '' }, { value: { source: 'node-output', nodeId: load.id, path: 'record.values.title_field' } });
  const setDesc = action({ type: 'set-component-value', targetNodeId: 'edit_desc', value: '' }, { value: { source: 'node-output', nodeId: load.id, path: 'record.values.desc_field' } });
  const loadFlow = workflow('edit_title', 'load', [load, setTitle, setDesc], [['trigger', 'next', load.id], [load.id, 'success', setTitle.id], [setTitle.id, 'next', setDesc.id]]);
  const update = action({ type: 'update-record', collectionId: collection.id, recordId: '', values: {} }, {
    '$recordId': { source: 'variable', name: 'selectedId' },
    title_field: { source: 'component', nodeId: 'edit_title', property: 'value' },
    desc_field: { source: 'component', nodeId: 'edit_desc', property: 'value' },
  });
  const afterUpdate = action({ type: 'navigate', targetScreenId: 'home' });
  const updateFlow = workflow('edit_save', 'click', [update, afterUpdate], [['trigger', 'next', update.id], [update.id, 'success', afterUpdate.id]]);

  return [
    { ...makeScreen('home', [theme, add, list]), behaviors: [addFlow.behavior, menuFlow.behavior], logicGraphs: [addFlow.graph, menuFlow.graph] },
    { ...makeScreen('add', [input('new_title', 'Title', 24), input('new_desc', 'Description', 80), makeButton('create_save', { props: { label: 'Save note', variant: 'solid' } })], 'Add note'), behaviors: [insertFlow.behavior], logicGraphs: [insertFlow.graph] },
    { ...makeScreen('edit', [input('edit_title', 'Edit title', 24), input('edit_desc', 'Edit description', 80), makeButton('edit_save', { props: { label: 'Save changes', variant: 'solid' } })], 'Edit note'), behaviors: [loadFlow.behavior, updateFlow.behavior], logicGraphs: [loadFlow.graph, updateFlow.graph] },
  ];
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('notes workflow in Preview', () => {
  it('keeps sandbox notes temporary and asks before discarding them when enabling persistence', async () => {
    const collection: DataCollection = {
      id: 'notes', projectId: PROJECT_ID, databaseId: 'database', name: 'Notes',
      fields: [
        { id: 'title_field', key: 'title', label: 'Title', type: 'text', required: true },
        { id: 'desc_field', key: 'description', label: 'Description', type: 'text', required: true },
      ], createdAt: new Date(), updatedAt: new Date(),
    };
    const createRecord = vi.fn();
    render(<PreviewOverlay collections={[collection]} initialDevice="mobile" onClose={vi.fn()} persistence={{ createRecord, updateRecord: vi.fn(), deleteRecord: vi.fn() }} projectName="Notes" recordsByCollection={new Map([[collection.id, []]])} screens={notesScreens(collection)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Temporary' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Not saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('Temporary')).toBeInTheDocument();
    expect(createRecord).not.toHaveBeenCalled();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const toggle = screen.getByRole('checkbox', { name: 'Save data changes' });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Temporary')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
    expect(createRecord).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('prevents a repeated save while the first write is pending', async () => {
    const collection: DataCollection = {
      id: 'notes', projectId: PROJECT_ID, databaseId: 'database', name: 'Notes',
      fields: [
        { id: 'title_field', key: 'title', label: 'Title', type: 'text', required: true },
        { id: 'desc_field', key: 'description', label: 'Description', type: 'text', required: true },
      ], createdAt: new Date(), updatedAt: new Date(),
    };
    let complete: (record: DataRecord) => void = () => undefined;
    const createRecord = vi.fn(() => new Promise<DataRecord>((resolve) => { complete = resolve; }));
    render(<PreviewOverlay collections={[collection]} initialDevice="mobile" onClose={vi.fn()} persistence={{ createRecord, updateRecord: vi.fn(), deleteRecord: vi.fn() }} projectName="Notes" recordsByCollection={new Map([[collection.id, []]])} screens={notesScreens(collection)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save data changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Once' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Only one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(createRecord).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox', { name: 'Save data changes' })).toBeDisabled();
    await act(async () => complete({ id: 'once', projectId: PROJECT_ID, collectionId: collection.id, values: { title_field: 'Once', desc_field: 'Only one' }, createdAt: new Date(), updatedAt: new Date() }));
    expect(await screen.findByText('Only one')).toBeInTheDocument();
  });

  it('keeps entered values on storage failure and does not navigate home', async () => {
    const collection: DataCollection = {
      id: 'notes', projectId: PROJECT_ID, databaseId: 'database', name: 'Notes',
      fields: [
        { id: 'title_field', key: 'title', label: 'Title', type: 'text', required: true },
        { id: 'desc_field', key: 'description', label: 'Description', type: 'text', required: true },
      ],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const createRecord = vi.fn().mockRejectedValue(new Error('Storage unavailable.'));
    render(<PreviewOverlay collections={[collection]} initialDevice="mobile" onClose={vi.fn()} persistence={{ createRecord, updateRecord: vi.fn(), deleteRecord: vi.fn() }} projectName="Notes" recordsByCollection={new Map([[collection.id, []]])} screens={notesScreens(collection)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save data changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Draft' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Keep this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable.');
    expect(screen.getByLabelText('Title')).toHaveValue('Draft');
    expect(screen.getByLabelText('Description')).toHaveValue('Keep this');
    expect(screen.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
  });

  it('creates, renders, edits and deletes the correct note with optional local persistence', async () => {
    const repo = new LocalStorageAppDataRepository(window.localStorage, { latencyMs: 0 });
    await repo.createDatabase(PROJECT_ID, { name: 'Notes database' });
    const collection = await repo.createCollection(PROJECT_ID, { name: 'Notes', fields: [
      { id: 'title_field', key: 'title', label: 'Title', type: 'text', required: true },
      { id: 'desc_field', key: 'description', label: 'Description', type: 'text', required: true },
    ] });
    const persistence: PreviewPersistenceActions = {
      createRecord: (id, values: Record<string, DataValue>) => repo.createRecord(PROJECT_ID, id, values),
      updateRecord: (id, recordId, values) => repo.updateRecord(PROJECT_ID, id, recordId, values),
      deleteRecord: (id, recordId) => repo.deleteRecord(PROJECT_ID, id, recordId),
    };
    const screens = notesScreens(collection);
    expect(validateProject({ screens }, [collection]).issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    const { unmount } = render(<PreviewOverlay collections={[collection]} initialDevice="mobile" onClose={vi.fn()} persistence={persistence} projectName="Notes" recordsByCollection={new Map([[collection.id, []]])} screens={screens} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save data changes' }));

    async function createNote(title: string, description: string) {
      fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
      fireEvent.change(await screen.findByLabelText('Title'), { target: { value: title } });
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: description } });
      fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
      expect(await screen.findByText(title)).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    }
    await createNote('First', 'First description');
    await createNote('Second', 'Second description');
    expect(await repo.listRecords(PROJECT_ID, collection.id)).toHaveLength(2);

    fireEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(document.querySelector('[data-screen-id="home"] > div')).toHaveClass('novy-app-theme-dark');
    expect(document.querySelector('[data-node-id="card_column"]')).toHaveStyle({ backgroundColor: '#222222' });
    expect(document.documentElement).not.toHaveClass('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Note actions: First' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    await waitFor(() => expect(screen.getByLabelText('Edit title')).toHaveValue('First'));
    expect(screen.getByLabelText('Edit description')).toHaveValue('First description');
    fireEvent.change(screen.getByLabelText('Edit description'), { target: { value: 'Updated description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Updated description')).toBeInTheDocument();
    expect(screen.getByText('Second description')).toBeInTheDocument();
    expect(document.querySelector('[data-screen-id="home"] > div')).toHaveClass('novy-app-theme-dark');

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Note actions: Second' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Second description')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Note actions: Second' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Second description')).not.toBeInTheDocument());
    const stored = await repo.listRecords(PROJECT_ID, collection.id);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.values).toEqual({ title_field: 'First', desc_field: 'Updated description' });
    confirm.mockRestore();

    unmount();
    render(<PreviewOverlay collections={[collection]} initialDevice="mobile" onClose={vi.fn()} persistence={persistence} projectName="Notes" recordsByCollection={new Map([[collection.id, stored]])} screens={screens} />);
    expect(within(screen.getByRole('dialog')).getByText('Updated description')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Save data changes' })).not.toBeChecked();
  });
});
