import { describe, expect, it } from 'vitest';
import type { DataCollection } from '../entities/appData';
import type { ProjectDocument } from '../entities/screen';
import { makeButton, makeListView, makeScreen, makeText } from '@test/editorFixtures';
import { validateProject } from './projectValidation';

function documentWith(...screens: ReturnType<typeof makeScreen>[]): ProjectDocument {
  return { screens };
}

describe('validateProject', () => {
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
          crossAxisAlignment: 'stretch', gap: 0, padding: 0, itemSpacing: 0, itemBorderRadius: 0,
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
