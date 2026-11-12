import { describe, expect, it } from 'vitest';
import type { Project } from '@domain/entities/project';
import { createPadding } from '@domain/entities/componentNode';
import { mapProjectToGeneratedLayout } from './generatedLayout';
import type { DataCollection } from '@domain/entities/appData';

const project: Project = {
  id: 'project_notes',
  name: 'Private Notes',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  document: {
    screens: [{
      id: 'screen_home',
      name: 'Home',
      path: '/',
      nodes: [{
        id: 'listview_notes',
        type: 'listview',
        x: 0,
        y: 0,
        w: 310,
        h: 200,
        props: {
          emptyText: 'No notes yet',
          showDividers: true,
          scrollDirection: 'vertical',
          crossAxisAlignment: 'stretch',
          gap: 0,
          padding: createPadding(12),
          itemSpacing: 10,
          itemBorderRadius: 8,
          dataSource: { kind: 'static', fields: [{ id: 'title', label: 'Title', type: 'text' }], items: [] },
        },
        children: [{
          id: 'text_note_title',
          type: 'text',
          x: 12,
          y: 12,
          w: 286,
          h: 44,
          props: { text: 'Note title', level: 'body' },
        }],
      }],
      behaviors: [],
      logicGraphs: [],
    }],
  },
};

describe('generated layout', () => {
  it('projects a ListView item frame as an explicit container', () => {
    const layout = mapProjectToGeneratedLayout(project);
    const screen = layout.screens[0]!;
    const listView = screen.nodes[0]!;

    expect(listView.type).toBe('listview');
    expect(listView.itemFrame).toMatchObject({
      id: 'listview_notes__item-frame',
      kind: 'container',
      role: 'repeated-item',
      constraints: { crossAxis: 'fill-listview', mainAxis: 'hug-content' },
      padding: createPadding(12),
      itemSpacing: 10,
      itemBorderRadius: 8,
      showDividers: true,
    });
    expect(listView.itemFrame?.children).toHaveLength(1);
    expect(listView.itemFrame?.children[0]?.id).toBe('text_note_title');
    expect(listView.children).toBeUndefined();
  });

  it('does not mutate the source project', () => {
    const before = structuredClone(project);
    mapProjectToGeneratedLayout(project);
    expect(project).toEqual(before);
  });

  it('exports Text field label visibility and border appearance', () => {
    const inputProject = structuredClone(project);
    inputProject.document.screens[0]!.nodes = [{
      id: 'email', type: 'input', x: 24, y: 24, w: 260, h: 44,
      appearance: { borderColor: '#334155', borderStyle: 'dashed', borderWidth: 3, borderRadius: 12 },
      props: { label: 'Email', showLabel: false, placeholder: 'you@example.com', inputType: 'email', multiline: false },
    }];

    expect(mapProjectToGeneratedLayout(inputProject).screens[0]?.nodes[0]).toMatchObject({
      appearance: { borderColor: '#334155', borderStyle: 'dashed', borderWidth: 3, borderRadius: 12 },
      props: { label: 'Email', showLabel: false },
    });
  });

  it('exports collection record identity and explicit route parameter mappings', () => {
    const collection: DataCollection = {
      id: 'notes', projectId: project.id, databaseId: 'database', name: 'Notes',
      identifier: { key: 'noteId', type: 'string', generation: 'backend' },
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const collectionProject = structuredClone(project);
    const screen = collectionProject.document.screens[0]!;
    screen.path = '/notes/:noteId';
    screen.routeParameters = [{
      name: 'noteId',
      source: { kind: 'record-id', collectionId: 'notes', identifierKey: 'noteId' },
    }];
    const list = screen.nodes[0];
    if (list?.type !== 'listview') throw new Error('Expected ListView fixture');
    list.props.dataSource = { kind: 'collection', collectionId: 'notes', displayFieldIds: ['title'] };

    const layout = mapProjectToGeneratedLayout(collectionProject, [collection]);
    expect(layout.screens[0]).toMatchObject({
      path: '/notes/:noteId',
      routeParameters: [{
        name: 'noteId', source: 'record-id', collectionId: 'notes', identifierKey: 'noteId',
      }],
    });
    expect(layout.screens[0]?.nodes[0]?.itemFrame?.recordIdentity).toEqual({
      collectionId: 'notes', key: 'noteId', source: 'record-id', generation: 'backend',
    });
  });
});
