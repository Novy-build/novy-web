import type { ButtonNode, ColumnNode, ComponentNode, ContainerNode, ImageNode, ListViewNode, TextNode } from '@domain/entities/componentNode';
import { createPadding } from '@domain/entities/componentNode';
import type { ProjectDocument, Screen } from '@domain/entities/screen';

/**
 * Reusable builders for editor tests. Fixed ids make selection/testid
 * queries deterministic across cases.
 */

export function makeText(id: string, overrides: Partial<TextNode> = {}): TextNode {
  return {
    id,
    type: 'text',
    x: 88,
    y: 96,
    w: 200,
    h: 36,
    props: { text: 'Hello, World!', level: 'display' },
    ...overrides,
  };
}

export function makeButton(id: string, overrides: Partial<ButtonNode> = {}): ButtonNode {
  return {
    id,
    type: 'button',
    x: 120,
    y: 560,
    w: 160,
    h: 44,
    props: { label: 'Click me', variant: 'solid' },
    ...overrides,
  };
}

export function makeContainer(id: string, children: ComponentNode[] = [], overrides: Partial<ContainerNode> = {}): ContainerNode {
  return {
    id,
    type: 'container',
    x: 24,
    y: 24,
    w: 200,
    h: 120,
    props: {},
    children,
    ...overrides,
  };
}

export function makeImage(id: string, overrides: Partial<ImageNode> = {}): ImageNode {
  return {
    id,
    type: 'image',
    x: 240,
    y: 24,
    w: 120,
    h: 80,
    props: { src: 'https://example.com/photo.png', alt: 'Photo', fit: 'cover' },
    ...overrides,
  };
}

export function makeListView(id: string, overrides: Partial<ListViewNode> = {}): ListViewNode {
  return {
    id,
    type: 'listview',
    x: 24,
    y: 400,
    w: 320,
    h: 160,
    props: {
      emptyText: 'No items yet',
      showDividers: true,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: createPadding(0),
      itemSpacing: 8,
      itemBorderRadius: 8,
      dataSource: {
        kind: 'static',
        fields: [{ id: 'value', label: 'Value', type: 'text' }],
        items: [
          { id: 'first', values: { value: 'First' } },
          { id: 'second', values: { value: 'Second' } },
        ],
      },
    },
    children: [{
      id: `${id}_item`,
      type: 'text',
      x: 0,
      y: 0,
      w: 320,
      h: 44,
      props: { text: 'List item', level: 'body' },
      bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'value' } }],
    }],
    ...overrides,
  };
}

export function makeColumn(id: string, children: ComponentNode[] = [], overrides: Partial<ColumnNode> = {}): ColumnNode {
  return {
    id,
    type: 'column',
    x: 24,
    y: 180,
    w: 320,
    h: 260,
    props: { mainAxisAlignment: 'start', crossAxisAlignment: 'stretch', gap: 12, padding: createPadding(16) },
    children,
    ...overrides,
  };
}

export function makeScreen(id: string, nodes: ComponentNode[], name = 'Home'): Screen {
  return {
    id,
    name,
    path: name === 'Home' ? '/' : `/${name.toLowerCase().replace(/\s+/g, '-')}`,
    nodes,
    behaviors: [],
    logicGraphs: [],
  };
}

export function makeDocument(screens: Screen[]): ProjectDocument {
  return { screens };
}
