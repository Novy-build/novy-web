import type { ButtonNode, ComponentNode, ContainerNode, FormNode, ImageNode, ListNode, TextNode } from '@domain/entities/componentNode';
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

export function makeList(id: string, overrides: Partial<ListNode> = {}): ListNode {
  return {
    id,
    type: 'list',
    x: 24,
    y: 400,
    w: 320,
    h: 160,
    props: { items: ['First', 'Second'], scrollable: true, showDividers: true },
    ...overrides,
  };
}

export function makeForm(id: string, overrides: Partial<FormNode> = {}): FormNode {
  return {
    id,
    type: 'form',
    x: 24,
    y: 180,
    w: 320,
    h: 260,
    props: {
      title: 'Contact us',
      fields: [
        { label: 'Name', placeholder: 'Your name', type: 'text' },
        { label: 'Email', placeholder: 'you@example.com', type: 'email' },
      ],
      submitLabel: 'Submit',
    },
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
