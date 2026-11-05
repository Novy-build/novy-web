import type { ComponentNode } from '@domain/entities/componentNode';

/** Human names for component types, shared by Inspector and Layers. */
export const NODE_TYPE_LABELS: Record<ComponentNode['type'], string> = {
  button: 'Button',
  text: 'Text',
  input: 'Input',
  image: 'Image',
  container: 'Container',
  list: 'List',
};

/** Short content snippet used in layer rows and aria labels. */
export function nodeDisplayLabel(node: ComponentNode): string {
  switch (node.type) {
    case 'button':
      return node.props.label;
    case 'text':
      return node.props.text;
    case 'input':
      return node.props.label;
    case 'image':
      return node.props.alt.length > 0 ? node.props.alt : 'Untitled image';
    case 'list':
      return `${node.props.items.length} item${node.props.items.length === 1 ? '' : 's'}`;
    case 'container':
      return 'Group';
  }
}

/** Unambiguous accessible name, e.g. "Button — Click me". */
export function nodeLayerName(node: ComponentNode): string {
  return `${NODE_TYPE_LABELS[node.type]} — ${nodeDisplayLabel(node)}`;
}
