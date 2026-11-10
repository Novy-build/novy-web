import { describe, expect, it } from 'vitest';
import { createPadding } from '../entities/componentNode';
import type { DataCollection } from '../entities/appData';
import type { ProjectDocument } from '../entities/screen';
import { makeButton, makeColumn, makeListView, makeScreen, makeText } from '@test/editorFixtures';
import { validateProject } from './projectValidation';

function documentWith(...screens: ReturnType<typeof makeScreen>[]): ProjectDocument {
  return { screens };
}

describe('validateProject', () => {
  it('warns when a Gesture Detector has no accessible action label', () => {
    const screen = makeScreen('screen_home', [{
      id: 'gesture', type: 'gesture-detector', x: 0, y: 0, w: 200, h: 80,
      props: { semanticLabel: '   ' }, children: [],
    }]);
    const report = validateProject(documentWith(screen));

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'component-label', componentId: 'gesture' }),
    ]));
  });

  it('accepts dynamic detail routes and record bindings supplied by navigation context', () => {
    const source = makeScreen('screen_home', [makeButton('open_note')]);
    source.behaviors = [{ id: 'open_behavior', name: 'Open note', event: 'click', graphId: 'open_graph', targetNodeId: 'open_note' }];
    source.logicGraphs = [{
      id: 'open_graph', name: 'Open note', sourceNodeId: 'open_note',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 0, y: 0 } },
        {
          kind: 'action', id: 'navigate', position: { x: 240, y: 0 },
          payload: { type: 'navigate', targetScreenId: 'screen_detail', recordContext: { collectionId: 'notes', recordId: 'note_1' } },
        },
      ],
      edges: [{ id: 'edge', fromNodeId: 'trigger', fromPort: 'next', toNodeId: 'navigate', toPort: 'in' }],
    }];
    const detail = makeScreen('screen_detail', [makeText('detail_title', {
      bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'title' } }],
    })]);
    detail.path = '/notes/:noteId';
    detail.routeParameters = [{
      name: 'noteId',
      source: { kind: 'record-id', collectionId: 'notes', identifierKey: 'noteId' },
    }];
    const notes: DataCollection = {
      id: 'notes', projectId: 'project', databaseId: 'database', name: 'Notes',
      identifier: { key: 'noteId', type: 'string', generation: 'backend' },
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };

    const report = validateProject(documentWith(source, detail), [notes]);
    expect(report.issues.map((issue) => issue.code)).not.toContain('screen-path-invalid');
    expect(report.issues.map((issue) => issue.code)).not.toContain('component-binding-context');
    expect(report.issues.map((issue) => issue.code)).not.toContain('component-binding-field');
    expect(report.issues.map((issue) => issue.code)).not.toContain('screen-route-parameter-unmapped');
  });

  it('reports stale route identifiers and collection-field conflicts', () => {
    const screen = makeScreen('screen_notes', []);
    screen.path = '/notes/:oldId';
    screen.routeParameters = [{
      name: 'oldId',
      source: { kind: 'record-id', collectionId: 'notes', identifierKey: 'oldId' },
    }];
    const notes: DataCollection = {
      id: 'notes', projectId: 'project', databaseId: 'database', name: 'Notes',
      identifier: { key: 'noteId', type: 'string', generation: 'backend' },
      fields: [{ id: 'identifier_field', key: 'noteId', label: 'Bad', type: 'text', required: false }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const report = validateProject(documentWith(screen), [notes]);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'screen-route-identifier-stale',
      'data-record-identifier-conflict',
    ]));
  });

  it('warns when a dynamic route segment has no record mapping', () => {
    const screen = makeScreen('screen_blog', []);
    screen.path = '/blog/:slug';

    const report = validateProject(documentWith(screen));

    expect(report.issues.map((issue) => issue.code)).toContain('screen-route-segment-unmapped');
  });

  it('warns when record-aware navigation targets the home route', () => {
    const source = makeScreen('screen_home', [makeButton('open_note')]);
    source.behaviors = [{ id: 'open_behavior', name: 'Open note', event: 'click', graphId: 'open_graph', targetNodeId: 'open_note' }];
    source.logicGraphs = [{
      id: 'open_graph', name: 'Open note', sourceNodeId: 'open_note',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 0, y: 0 } },
        {
          kind: 'action', id: 'navigate', position: { x: 240, y: 0 },
          payload: { type: 'navigate', targetScreenId: 'screen_home', recordContext: { collectionId: 'notes', recordId: '' } },
        },
      ],
      edges: [],
    }];
    const notes: DataCollection = {
      id: 'notes', projectId: 'project', databaseId: 'database', name: 'Notes',
      identifier: { key: 'noteId', type: 'string', generation: 'backend' },
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };

    const report = validateProject(documentWith(source), [notes]);

    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'screen-route-home-target',
      'screen-route-parameter-unmapped',
    ]));
  });

  it('warns when one screen is opened for multiple record collections', () => {
    const source = makeScreen('screen_home', [makeButton('open_record')]);
    source.behaviors = [{ id: 'open_behavior', name: 'Open record', event: 'click', graphId: 'open_graph', targetNodeId: 'open_record' }];
    source.logicGraphs = [{
      id: 'open_graph', name: 'Open record', sourceNodeId: 'open_record',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 0, y: 0 } },
        {
          kind: 'action', id: 'open_note', position: { x: 240, y: 0 },
          payload: { type: 'navigate', targetScreenId: 'screen_detail', recordContext: { collectionId: 'notes', recordId: '' } },
        },
        {
          kind: 'action', id: 'open_task', position: { x: 480, y: 0 },
          payload: { type: 'navigate', targetScreenId: 'screen_detail', recordContext: { collectionId: 'tasks', recordId: '' } },
        },
      ],
      edges: [],
    }];
    const detail = makeScreen('screen_detail', []);
    detail.path = '/detail/:noteId/:taskId';
    detail.routeParameters = [
      { name: 'noteId', source: { kind: 'record-id', collectionId: 'notes', identifierKey: 'noteId' } },
      { name: 'taskId', source: { kind: 'record-id', collectionId: 'tasks', identifierKey: 'taskId' } },
    ];
    const notes: DataCollection = {
      id: 'notes', projectId: 'project', databaseId: 'database', name: 'Notes',
      identifier: { key: 'noteId', type: 'string', generation: 'backend' },
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const tasks: DataCollection = {
      ...notes,
      id: 'tasks',
      name: 'Tasks',
      identifier: { key: 'taskId', type: 'string', generation: 'backend' },
    };

    const report = validateProject(documentWith(source, detail), [notes, tasks]);

    expect(report.issues.map((issue) => issue.code)).toContain('screen-route-multiple-collections');
    expect(report.issues.map((issue) => issue.code)).not.toContain('screen-route-parameter-unmapped');
  });

  it('returns valid for a complete project', () => {
    const screen = makeScreen('screen_home', [makeText('node_text'), makeButton('node_button')]);
    const report = validateProject(documentWith(screen));

    expect(report.isValid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('reports duplicate component IDs and invalid geometry', () => {
    const screen = makeScreen('screen_home', [
      makeText('node_text', { w: 0 }),
      makeText('node_text'),
    ]);
    const report = validateProject(documentWith(screen));

    expect(report.isValid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('component-duplicate-id');
    expect(report.issues.map((issue) => issue.code)).toContain('component-size-invalid');
  });

  it('reports missing logic targets, graphs, and cycles', () => {
    const screen = makeScreen('screen_home', [makeButton('node_button')]);
    screen.behaviors = [{ id: 'behavior_1', name: 'Broken', event: 'click', graphId: 'graph_1', targetNodeId: 'ghost' }];
    screen.logicGraphs = [{
      id: 'graph_1',
      name: 'Broken',
      sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 80, y: 160 } },
        { kind: 'action', id: 'action', payload: { type: 'navigate', targetScreenId: 'missing' }, position: { x: 312, y: 160 } },
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'trigger', fromPort: 'next', toNodeId: 'action', toPort: 'in' },
        { id: 'edge_2', fromNodeId: 'action', fromPort: 'next', toNodeId: 'trigger', toPort: 'in' },
      ],
    }];
    const report = validateProject(documentWith(screen));

    expect(report.isValid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'logic-missing-target',
      'logic-cycle',
      'logic-missing-screen',
    ]));
  });

  it('reports missing data collections and fields', () => {
    const screen = makeScreen('screen_home', [
      makeListView('node_list', {
        props: {
          emptyText: 'No records', showDividers: true, scrollDirection: 'vertical',
          crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 0, itemBorderRadius: 0,
          dataSource: { kind: 'collection', collectionId: 'ghost', displayFieldIds: ['field'] },
        },
      }),
    ]);
    const collection: DataCollection = {
      id: 'students',
      projectId: 'project',
      databaseId: 'database',
      name: '',
      fields: [
        { id: 'name', key: 'name', label: '', type: 'text', required: false },
        { id: 'name2', key: 'name', label: 'Name', type: 'text', required: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const report = validateProject(documentWith(screen), [collection]);

    expect(report.isValid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'data-missing-collection',
      'data-collection-name',
      'data-field-duplicate-key',
      'data-field-label',
    ]));
  });

  it('rejects negative ListView item spacing and radius', () => {
    const list = makeListView('node_list', {
      props: {
        ...makeListView('defaults').props,
        itemSpacing: -1,
        itemBorderRadius: -2,
      },
    });
    const report = validateProject(documentWith(makeScreen('screen_home', [list])));

    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'component-layout-spacing' }));
  });

  it('rejects negative per-side layout padding', () => {
    const column = makeColumn('column', [], {
      props: {
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
        gap: 0,
        padding: { mode: 'only', top: -1, right: 0, bottom: 0, left: 0 },
      },
    });
    const list = makeListView('list', {
      props: {
        ...makeListView('defaults').props,
        padding: { mode: 'only', top: 0, right: 0, bottom: -2, left: 0 },
      },
    });
    const report = validateProject(documentWith(makeScreen('screen_home', [column, list])));

    expect(report.issues.filter((issue) => issue.code === 'component-layout-spacing')).toHaveLength(2);
  });

  it('validates typed item bindings and structured static records', () => {
    const outside = makeText('outside', {
      bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'value' } }],
    });
    const list = makeListView('list');
    if (list.props.dataSource.kind === 'static') {
      list.props.dataSource.fields = [{ id: 'score', label: 'Score', type: 'number' }];
      list.props.dataSource.items = [
        { id: 'duplicate', values: { score: 'not-a-number' } },
        { id: 'duplicate', values: { score: 42 } },
      ];
      list.children[0]!.bindings = [{ target: 'text.content', value: { source: 'list-item', fieldId: 'missing' } }];
    }

    const report = validateProject(documentWith(makeScreen('screen_home', [outside, list])));
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'component-binding-context',
      'component-binding-field',
      'data-static-item-duplicate',
      'data-static-item-type',
    ]));
  });

  it('accepts current item IDs only within a repeated ListView item', () => {
    const list = makeListView('list');
    list.children.push(makeButton('item_action'));
    const home = makeScreen('screen_home', [list, makeButton('outside')]);
    home.behaviors = [{ id: 'behavior', name: 'Item action', event: 'click', graphId: 'graph', targetNodeId: 'item_action' }];
    home.logicGraphs = [{
      id: 'graph', name: 'Item action', sourceNodeId: 'item_action',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 0, y: 0 } },
        { kind: 'action', id: 'set_id', position: { x: 100, y: 0 }, payload: { type: 'set-variable', name: 'selectedId', value: '' }, inputMappings: { value: { source: 'list-item', fieldId: '$id' } } },
      ], edges: [{ id: 'edge', fromNodeId: 'trigger', fromPort: 'next', toNodeId: 'set_id', toPort: 'in' }],
    }];
    expect(validateProject(documentWith(home)).issues.map((issue) => issue.code)).not.toContain('logic-list-item-field');
    home.logicGraphs[0]!.sourceNodeId = 'outside';
    expect(validateProject(documentWith(home)).issues.map((issue) => issue.code)).toContain('logic-list-item-context');
  });

  it('validates unique routes, action mappings, async ports, email, and refresh references', () => {
    const home = makeScreen('screen_home', [makeButton('node_button')]);
    const duplicate = makeScreen('screen_other', [], 'Other');
    duplicate.path = '/';
    home.behaviors = [{
      id: 'behavior_1',
      name: 'Submit',
      event: 'click',
      graphId: 'graph_1',
      targetNodeId: 'node_button',
    }];
    home.logicGraphs = [{
      id: 'graph_1',
      name: 'Submit',
      sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 80, y: 160 } },
        {
          kind: 'action',
          id: 'email',
          position: { x: 312, y: 160 },
          payload: { type: 'send-email', to: '', subject: '', body: '' },
          inputMappings: {
            to: { source: 'component', nodeId: 'missing_input', property: 'value' },
          },
        },
        {
          kind: 'action',
          id: 'refresh',
          position: { x: 544, y: 160 },
          payload: { type: 'refresh-collection', collectionId: 'missing_collection' },
        },
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'trigger', fromPort: 'next', toNodeId: 'email', toPort: 'in' },
        { id: 'edge_2', fromNodeId: 'email', fromPort: 'next', toNodeId: 'refresh', toPort: 'in' },
      ],
    }];

    const report = validateProject(documentWith(home, duplicate));
    expect(report.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'screen-path-duplicate',
      'logic-invalid-output-port',
      'logic-empty-email',
      'logic-empty-email-subject',
      'logic-missing-input-source',
      'data-missing-collection',
    ]));
  });

  it('restricts Add Local List Item to typed fields on static ListViews', () => {
    const local = makeListView('local_list');
    if (local.props.dataSource.kind === 'static') {
      local.props.dataSource.fields = [{ id: 'score', label: 'Score', type: 'number' }];
    }
    const collection = makeListView('collection_list');
    collection.props.dataSource = {
      kind: 'collection',
      collectionId: 'students',
      displayFieldIds: ['name'],
      sortDirection: 'asc',
    };
    const home = makeScreen('screen_home', [makeButton('node_button'), local, collection]);
    home.behaviors = [{
      id: 'behavior', name: 'Add item', event: 'click', graphId: 'graph', targetNodeId: 'node_button',
    }];
    home.logicGraphs = [{
      id: 'graph', name: 'Add item', sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 0, y: 0 } },
        {
          kind: 'action', id: 'bad_values', position: { x: 200, y: 0 },
          payload: {
            type: 'add-local-list-item', targetNodeId: 'local_list', placement: 'append',
            values: { score: 'not-a-number', missing: 'value' },
          },
          inputMappings: { missing_mapping: { source: 'literal', value: 'x' } },
        },
        {
          kind: 'action', id: 'collection_target', position: { x: 400, y: 0 },
          payload: {
            type: 'add-local-list-item', targetNodeId: 'collection_list', placement: 'append', values: {},
          },
        },
      ],
      edges: [],
    }];

    const report = validateProject(documentWith(home), [{
      id: 'students', projectId: 'project', databaseId: 'database', name: 'Students',
      fields: [{ id: 'name', key: 'name', label: 'Name', type: 'text', required: true }],
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    }]);
    expect(report.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'logic-local-list-value-type',
      'logic-local-list-field',
      'logic-local-list-target',
    ]));
  });
});
