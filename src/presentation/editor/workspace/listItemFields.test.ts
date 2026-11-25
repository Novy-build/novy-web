import { describe, expect, it } from 'vitest';
import type { DataCollection } from '@domain/entities/appData';
import type { ListViewNode } from '@domain/entities/componentNode';
import type { LoadListItemsPayload, LogicGraph } from '@domain/entities/logic';
import { createComponentNode } from '@domain/factories/componentNode';
import { resolveListItemFieldSource } from './listItemFields';

const collection: DataCollection = {
  id: 'notes_collection',
  projectId: 'project_1',
  databaseId: 'database_1',
  name: 'notes-collection',
  fields: [
    { id: 'field_title', key: 'title', label: 'Title', type: 'text', required: true },
    { id: 'field_body', key: 'body', label: 'Body', type: 'text', required: false },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function listView(): ListViewNode {
  return createComponentNode('listview') as ListViewNode;
}

function loaderGraph(nodeId: string, fields: LoadListItemsPayload['fields']): LogicGraph {
  return {
    id: 'graph_1',
    name: 'Load notes',
    sourceNodeId: nodeId,
    nodes: [
      { kind: 'trigger', id: 'trigger_1', event: 'load', position: { x: 0, y: 0 } },
      {
        kind: 'action', id: 'action_1', position: { x: 200, y: 0 },
        payload: { type: 'load-list-items', targetNodeId: nodeId, collectionId: collection.id, fields },
      },
    ],
    edges: [{ id: 'edge_1', fromNodeId: 'trigger_1', fromPort: 'next', toNodeId: 'action_1', toPort: 'in' }],
  };
}

describe('resolveListItemFieldSource', () => {
  it('prefers load-list-items fields over the ListView default static field', () => {
    const node = listView();

    const result = resolveListItemFieldSource(
      node,
      [loaderGraph(node.id, [
        { id: 'field_title', label: 'Title', type: 'text' },
        { id: 'field_body', label: 'Body', type: 'text' },
      ])],
      [collection],
      undefined,
    );

    expect(result.fields).toEqual([
      { id: 'field_title', label: 'Title', type: 'text' },
      { id: 'field_body', label: 'Body', type: 'text' },
    ]);
    expect(result.sourceName).toBe('notes-collection');
    expect(result.collection).toBe(collection);
  });

  it('offers collection fields when the loader has no explicit field list', () => {
    const node = listView();

    const result = resolveListItemFieldSource(node, [loaderGraph(node.id, [])], [collection], undefined);

    expect(result.fields).toEqual([
      { id: 'field_title', label: 'Title', type: 'text' },
      { id: 'field_body', label: 'Body', type: 'text' },
    ]);
    expect(result.sourceName).toBe('notes-collection');
  });

  it('ignores loaders targeting a different ListView', () => {
    const node = listView();

    const result = resolveListItemFieldSource(node, [loaderGraph('other_list', [
      { id: 'field_title', label: 'Title', type: 'text' },
    ])], [collection], undefined);

    expect(result.fields).toEqual([{ id: 'value', label: 'Value', type: 'text' }]);
    expect(result.sourceName).toBe('Static items');
  });

  it('falls back to the collection fields for a collection-backed ListView', () => {
    const node: ListViewNode = {
      ...listView(),
      props: {
        ...listView().props,
        dataSource: { kind: 'collection', collectionId: collection.id, displayFieldIds: ['field_title'], searchFieldId: undefined, sortFieldId: undefined, sortDirection: 'asc' },
      },
    };

    const result = resolveListItemFieldSource(node, [], [collection], undefined);

    expect(result.fields).toEqual([
      { id: 'field_title', label: 'Title', type: 'text' },
      { id: 'field_body', label: 'Body', type: 'text' },
    ]);
    expect(result.sourceName).toBe('notes-collection');
  });
});
