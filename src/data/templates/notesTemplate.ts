import { createPadding } from '@domain/entities/componentNode';
import type { ComponentNode } from '@domain/entities/componentNode';
import { CURRENT_ITEM_ID_FIELD } from '@domain/entities/logic';
import type { ActionNode, Behavior, LogicGraph } from '@domain/entities/logic';
import type { Screen } from '@domain/entities/screen';
import type { Template } from '@domain/entities/template';

export const NOTES_COLLECTION_REFERENCE = 'template-notes-collection';
export const NOTE_TITLE_FIELD = 'note_title';
export const NOTE_CONTENT_FIELD = 'note_content';

const NOTES_SCREEN_ID = 'screen_notes_home';
const ADD_NOTE_SCREEN_ID = 'screen_notes_add';
const NOTE_DETAIL_SCREEN_ID = 'screen_notes_detail';
const EDIT_NOTE_SCREEN_ID = 'screen_notes_edit';

const notesScreen = makeScreen(NOTES_SCREEN_ID, 'Notes', '/', [
  appBackground('notes_background'),
  {
    id: 'notes_heading',
    type: 'text',
    x: 24,
    y: 56,
    w: 260,
    h: 48,
    props: { text: 'Notes', level: 'display', fontSize: 40, fontWeight: 'bold' },
  },
  {
    id: 'notes_list',
    type: 'listview',
    x: 24,
    y: 128,
    w: 342,
    h: 520,
    props: {
      emptyText: 'No notes yet. Add your first note.',
      showDividers: false,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: createPadding(0),
      itemSpacing: 10,
      itemBorderRadius: 12,
      dataSource: {
        kind: 'collection',
        collectionId: NOTES_COLLECTION_REFERENCE,
        displayFieldIds: [NOTE_TITLE_FIELD, NOTE_CONTENT_FIELD],
      },
    },
    children: [
      {
        id: 'note_card',
        type: 'gesture-detector',
        x: 0,
        y: 0,
        w: 342,
        h: 72,
        appearance: {
          backgroundColor: '#f8f9fc',
          borderColor: '#e5e7eb',
          borderStyle: 'solid',
          borderRadius: 12,
          dark: { backgroundColor: '#1f2937', borderColor: '#374151' },
        },
        props: { semanticLabel: 'Open note' },
        children: [
          {
            id: 'note_card_title',
            type: 'text',
            x: 16,
            y: 13,
            w: 258,
            h: 24,
            props: { text: 'Note title', level: 'title', fontSize: 16, fontWeight: 'semibold' },
            bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: NOTE_TITLE_FIELD } }],
          },
          {
            id: 'note_card_content',
            type: 'text',
            x: 16,
            y: 39,
            w: 258,
            h: 20,
            appearance: { textColor: '#6b7280', dark: { textColor: '#9ca3af' } },
            props: { text: 'Note content', level: 'body', fontSize: 13 },
            bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: NOTE_CONTENT_FIELD } }],
          },
        ],
      },
      {
        id: 'note_card_menu',
        type: 'dropdown',
        x: 286,
        y: 14,
        w: 44,
        h: 44,
        props: {
          label: 'Note actions',
          placeholder: '',
          options: ['Delete'],
          selectedIndex: -1,
          presentation: 'menu',
        },
      },
    ],
  },
  {
    id: 'notes_add',
    type: 'button',
    x: 286,
    y: 684,
    w: 80,
    h: 52,
    appearance: { borderRadius: 26 },
    props: { label: 'Add', variant: 'solid', icon: 'plus' },
  },
]);

const addNoteScreen = makeScreen(ADD_NOTE_SCREEN_ID, 'Add Note', '/notes/new', [
  appBackground('add_background'),
  heading('add_heading', 'Add note'),
  input('add_title', 'Title', 'Enter a note title', 112, false),
  input('add_content', 'Content', 'Write your note', 184, true),
  button('add_save', 'Save note', 454, 'solid', 'save'),
  button('add_cancel', 'Cancel', 510, 'text'),
]);

const noteDetailScreen = makeScreen(NOTE_DETAIL_SCREEN_ID, 'Note Detail', '/notes/:noteId', [
  appBackground('detail_background'),
  {
    id: 'detail_back',
    type: 'button',
    x: 16,
    y: 36,
    w: 92,
    h: 44,
    props: { label: 'Back', variant: 'text', icon: 'arrow-left' },
  },
  {
    id: 'detail_title',
    type: 'text',
    x: 24,
    y: 112,
    w: 342,
    h: 56,
    props: { text: 'Note title', level: 'display', fontSize: 32, fontWeight: 'bold' },
    bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: NOTE_TITLE_FIELD } }],
  },
  {
    id: 'detail_content',
    type: 'text',
    x: 24,
    y: 184,
    w: 342,
    h: 360,
    appearance: { textColor: '#4b5563', dark: { textColor: '#d1d5db' } },
    props: { text: 'Note content', level: 'body', fontSize: 17 },
    bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: NOTE_CONTENT_FIELD } }],
  },
  button('detail_edit', 'Edit note', 600, 'solid', 'pencil'),
  button('detail_delete', 'Delete note', 656, 'outline', 'trash'),
]);

const editNoteScreen = makeScreen(EDIT_NOTE_SCREEN_ID, 'Edit Note', '/notes/:noteId/edit', [
  appBackground('edit_background'),
  heading('edit_heading', 'Edit note'),
  input('edit_title', 'Title', 'Enter a note title', 112, false),
  input('edit_content', 'Content', 'Write your note', 184, true),
  button('edit_save', 'Save changes', 454, 'solid', 'save'),
  button('edit_cancel', 'Cancel', 510, 'text'),
]);

wireScreen(notesScreen, [
  behavior('behavior_notes_add', 'Add note', 'click', 'graph_notes_add', 'notes_add'),
  behavior('behavior_notes_open', 'Open note', 'click', 'graph_notes_open', 'note_card'),
  behavior('behavior_notes_menu', 'Delete note from menu', 'change', 'graph_notes_menu', 'note_card_menu'),
], [
  graph('graph_notes_add', 'Add note', 'notes_add', 'click', [
    action('navigate_to_add', { type: 'navigate', targetScreenId: ADD_NOTE_SCREEN_ID }),
  ]),
  graph('graph_notes_open', 'Open note', 'note_card', 'click', [
    action(
      'navigate_to_detail',
      { type: 'navigate', targetScreenId: NOTE_DETAIL_SCREEN_ID, recordContext: { collectionId: NOTES_COLLECTION_REFERENCE, recordId: '' } },
      { '$recordId': { source: 'list-item', fieldId: CURRENT_ITEM_ID_FIELD } },
    ),
  ]),
  graph('graph_notes_menu', 'Delete note from menu', 'note_card_menu', 'change', [
    action(
      'delete_note_from_menu',
      { type: 'delete-record', collectionId: NOTES_COLLECTION_REFERENCE, recordId: '', confirm: true },
      { '$recordId': { source: 'list-item', fieldId: CURRENT_ITEM_ID_FIELD } },
    ),
  ]),
]);

wireScreen(addNoteScreen, [
  behavior('behavior_add_save', 'Save new note', 'click', 'graph_add_save', 'add_save'),
  behavior('behavior_add_cancel', 'Cancel new note', 'click', 'graph_add_cancel', 'add_cancel'),
], [
  graph('graph_add_save', 'Save new note', 'add_save', 'click', [
    action(
      'insert_note',
      { type: 'insert-record', collectionId: NOTES_COLLECTION_REFERENCE, values: {} },
      {
        [NOTE_TITLE_FIELD]: { source: 'component', nodeId: 'add_title', property: 'value' },
        [NOTE_CONTENT_FIELD]: { source: 'component', nodeId: 'add_content', property: 'value' },
      },
    ),
    action('navigate_after_insert', { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }),
  ], ['success']),
  graph('graph_add_cancel', 'Cancel new note', 'add_cancel', 'click', [
    action('navigate_cancel_add', { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }),
  ]),
]);

wireScreen(noteDetailScreen, [
  behavior('behavior_detail_back', 'Back to notes', 'click', 'graph_detail_back', 'detail_back'),
  behavior('behavior_detail_edit', 'Edit note', 'click', 'graph_detail_edit', 'detail_edit'),
  behavior('behavior_detail_delete', 'Delete note', 'click', 'graph_detail_delete', 'detail_delete'),
], [
  graph('graph_detail_back', 'Back to notes', 'detail_back', 'click', [
    action('navigate_detail_back', { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }),
  ]),
  graph('graph_detail_edit', 'Edit note', 'detail_edit', 'click', [
    action(
      'navigate_to_edit',
      { type: 'navigate', targetScreenId: EDIT_NOTE_SCREEN_ID, recordContext: { collectionId: NOTES_COLLECTION_REFERENCE, recordId: '' } },
      { '$recordId': { source: 'variable', name: 'route.recordId' } },
    ),
  ]),
  graph('graph_detail_delete', 'Delete note', 'detail_delete', 'click', [
    action(
      'delete_note_from_detail',
      { type: 'delete-record', collectionId: NOTES_COLLECTION_REFERENCE, recordId: '', confirm: true },
      { '$recordId': { source: 'variable', name: 'route.recordId' } },
    ),
    action('navigate_after_detail_delete', { type: 'navigate', targetScreenId: NOTES_SCREEN_ID }),
  ], ['success']),
]);

wireScreen(editNoteScreen, [
  behavior('behavior_edit_load', 'Load note', 'load', 'graph_edit_load', 'edit_title'),
  behavior('behavior_edit_save', 'Save note changes', 'click', 'graph_edit_save', 'edit_save'),
  behavior('behavior_edit_cancel', 'Cancel edit', 'click', 'graph_edit_cancel', 'edit_cancel'),
], [
  graph('graph_edit_load', 'Load note', 'edit_title', 'load', [
    action(
      'load_note_for_edit',
      { type: 'get-record', collectionId: NOTES_COLLECTION_REFERENCE, recordId: '' },
      { '$recordId': { source: 'variable', name: 'route.recordId' } },
    ),
    action(
      'prefill_edit_title',
      { type: 'set-component-value', targetNodeId: 'edit_title', value: '' },
      { value: { source: 'node-output', nodeId: 'load_note_for_edit', path: `record.values.${NOTE_TITLE_FIELD}` } },
    ),
    action(
      'prefill_edit_content',
      { type: 'set-component-value', targetNodeId: 'edit_content', value: '' },
      { value: { source: 'node-output', nodeId: 'load_note_for_edit', path: `record.values.${NOTE_CONTENT_FIELD}` } },
    ),
  ], ['success', 'next']),
  graph('graph_edit_save', 'Save note changes', 'edit_save', 'click', [
    action(
      'update_note',
      { type: 'update-record', collectionId: NOTES_COLLECTION_REFERENCE, recordId: '', values: {} },
      {
        '$recordId': { source: 'variable', name: 'route.recordId' },
        [NOTE_TITLE_FIELD]: { source: 'component', nodeId: 'edit_title', property: 'value' },
        [NOTE_CONTENT_FIELD]: { source: 'component', nodeId: 'edit_content', property: 'value' },
      },
    ),
    action(
      'navigate_after_update',
      { type: 'navigate', targetScreenId: NOTE_DETAIL_SCREEN_ID, recordContext: { collectionId: NOTES_COLLECTION_REFERENCE, recordId: '' } },
      { '$recordId': { source: 'variable', name: 'route.recordId' } },
    ),
  ], ['success']),
  graph('graph_edit_cancel', 'Cancel edit', 'edit_cancel', 'click', [
    action(
      'navigate_cancel_edit',
      { type: 'navigate', targetScreenId: NOTE_DETAIL_SCREEN_ID, recordContext: { collectionId: NOTES_COLLECTION_REFERENCE, recordId: '' } },
      { '$recordId': { source: 'variable', name: 'route.recordId' } },
    ),
  ]),
]);

export const NOTES_TEMPLATE: Template = {
  id: 'template_notes',
  name: 'Notes CRUD app',
  description: 'A basic notes app demonstrating create, read, update, and delete workflows.',
  screens: [notesScreen, addNoteScreen, noteDetailScreen, editNoteScreen],
  data: {
    databaseName: 'Notes Database',
    collections: [{
      referenceId: NOTES_COLLECTION_REFERENCE,
      name: 'Notes',
      fields: [
        { id: NOTE_TITLE_FIELD, key: 'title', label: 'Title', type: 'text', required: true },
        { id: NOTE_CONTENT_FIELD, key: 'content', label: 'Content', type: 'text', required: false },
      ],
      records: [
        { [NOTE_TITLE_FIELD]: 'Created with Novy', [NOTE_CONTENT_FIELD]: 'A basic CRUD notes example.' },
        { [NOTE_TITLE_FIELD]: 'Minimal notes', [NOTE_CONTENT_FIELD]: 'Simple, focused, and editable.' },
        { [NOTE_TITLE_FIELD]: 'Build with confidence', [NOTE_CONTENT_FIELD]: 'Open, edit, or delete any note.' },
      ],
    }],
  },
};

function makeScreen(id: string, name: string, path: string, nodes: ComponentNode[]): Screen {
  return { id, name, path, nodes, behaviors: [], logicGraphs: [] };
}

function wireScreen(screen: Screen, behaviors: Behavior[], logicGraphs: LogicGraph[]): void {
  screen.behaviors = behaviors;
  screen.logicGraphs = logicGraphs;
}

function heading(id: string, text: string): ComponentNode {
  return {
    id,
    type: 'text',
    x: 24,
    y: 48,
    w: 342,
    h: 48,
    props: { text, level: 'display', fontSize: 36, fontWeight: 'bold' },
  };
}

function appBackground(id: string): ComponentNode {
  return {
    id,
    type: 'container',
    x: 0,
    y: 0,
    w: 390,
    h: 780,
    isLocked: true,
    appearance: {
      backgroundColor: '#eef0f7',
      dark: { backgroundColor: '#111827' },
    },
    props: {},
    children: [],
  };
}

function input(id: string, label: string, placeholder: string, y: number, multiline: boolean): ComponentNode {
  return {
    id,
    type: 'input',
    x: 24,
    y,
    w: 342,
    h: multiline ? 246 : 56,
    props: { label, placeholder, inputType: 'text', multiline },
  };
}

function button(
  id: string,
  label: string,
  y: number,
  variant: 'solid' | 'outline' | 'text',
  icon?: 'save' | 'pencil' | 'trash',
): ComponentNode {
  return {
    id,
    type: 'button',
    x: 24,
    y,
    w: 342,
    h: 48,
    props: { label, variant, ...(icon ? { icon } : {}) },
  };
}

function behavior(
  id: string,
  name: string,
  event: Behavior['event'],
  graphId: string,
  targetNodeId: string,
): Behavior {
  return { id, name, event, graphId, targetNodeId };
}

function action(
  id: string,
  payload: ActionNode['payload'],
  inputMappings?: ActionNode['inputMappings'],
): ActionNode {
  return {
    kind: 'action',
    id,
    payload,
    ...(inputMappings ? { inputMappings } : {}),
    position: { x: 312, y: 160 },
  };
}

function graph(
  id: string,
  name: string,
  sourceNodeId: string,
  event: Behavior['event'],
  actions: ActionNode[],
  ports: Array<'next' | 'success'> = [],
): LogicGraph {
  const triggerId = `${id}_trigger`;
  return {
    id,
    name,
    sourceNodeId,
    nodes: [
      { kind: 'trigger', id: triggerId, event, position: { x: 80, y: 160 } },
      ...actions.map((node, index) => ({ ...node, position: { x: 312 + index * 232, y: 160 } })),
    ],
    edges: actions.map((node, index) => ({
      id: `${id}_edge_${index + 1}`,
      fromNodeId: index === 0 ? triggerId : actions[index - 1]!.id,
      fromPort: index === 0 ? 'next' : ports[index - 1] ?? 'next',
      toNodeId: node.id,
      toPort: 'in',
    })),
  };
}
