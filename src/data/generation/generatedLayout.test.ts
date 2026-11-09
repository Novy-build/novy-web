import { describe, expect, it } from 'vitest';
import type { Project } from '@domain/entities/project';
import { createPadding } from '@domain/entities/componentNode';
import { mapProjectToGeneratedLayout } from './generatedLayout';

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
});
