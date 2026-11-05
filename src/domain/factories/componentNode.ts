import type {
  ButtonNode,
  ComponentNode,
  ComponentType,
  ContainerNode,
  ImageNode,
  InputNode,
  ListNode,
  TextNode,
} from '../entities/componentNode';
import { generateId } from '../ids';

/**
 * Default geometry + props for a palette drop. Every component spawns at a
 * sensible size and position; Phase 4 drop logic replaces x/y with the drop
 * point.
 */
function createButtonNode(): ButtonNode {
  return {
    id: generateId('node'),
    type: 'button',
    x: 24,
    y: 24,
    w: 160,
    h: 44,
    props: { label: 'Click me', variant: 'solid' },
  };
}

function createTextNode(): TextNode {
  return {
    id: generateId('node'),
    type: 'text',
    x: 24,
    y: 24,
    w: 220,
    h: 28,
    props: { text: 'Add your text', level: 'body' },
  };
}

function createInputNode(): InputNode {
  return {
    id: generateId('node'),
    type: 'input',
    x: 24,
    y: 24,
    w: 260,
    h: 44,
    props: { label: 'Label', placeholder: 'Enter value' },
  };
}

function createImageNode(): ImageNode {
  return {
    id: generateId('node'),
    type: 'image',
    x: 24,
    y: 24,
    w: 280,
    h: 160,
    props: { src: '', alt: 'Image', fit: 'cover' },
  };
}

function createContainerNode(): ContainerNode {
  return {
    id: generateId('node'),
    type: 'container',
    x: 24,
    y: 24,
    w: 320,
    h: 200,
    props: {},
    children: [],
  };
}

function createListNode(): ListNode {
  return {
    id: generateId('node'),
    type: 'list',
    x: 24,
    y: 24,
    w: 280,
    h: 180,
    props: { items: [] },
  };
}

interface NodeFactory {
  (): ComponentNode;
}

const factories: Record<ComponentType, NodeFactory> = {
  button: createButtonNode,
  text: createTextNode,
  input: createInputNode,
  image: createImageNode,
  container: createContainerNode,
  list: createListNode,
};

/** Creates a palette component with sensible defaults, ready to drop on canvas. */
export function createComponentNode(type: ComponentType): ComponentNode {
  return factories[type]();
}

/** Default node size per component type, used by drop logic in Phase 4. */
export function getDefaultNodeSize(type: ComponentType): { w: number; h: number } {
  const node = factories[type]();
  return { w: node.w, h: node.h };
}
