import type { ComponentNode } from '@domain/entities/componentNode';

/** Human names for component types, shared by Inspector and Layers. */
export const NODE_TYPE_LABELS: Record<ComponentNode['type'], string> = {
  button: 'Button',
  text: 'Text',
  icon: 'Icon',
  input: 'Text field',
  image: 'Image',
  container: 'Container',
  'gesture-detector': 'Gesture Detector',
  column: 'Column',
  row: 'Row',
  listview: 'ListView',
  checkbox: 'Checkbox',
  radio: 'Radio group',
  switch: 'Switch',
  dropdown: 'Dropdown',
  slider: 'Slider',
  progress: 'Progress',
  divider: 'Divider',
  camera: 'Camera',
  'file-input': 'File input',
  chat: 'Chat',
  chart: 'Chart',
};

/** Short content snippet used in layer rows and aria labels. */
export function nodeDisplayLabel(node: ComponentNode): string {
  const customName = node.name?.trim();
  if (customName) {
    return customName;
  }
  switch (node.type) {
    case 'button':
      return node.props.label;
    case 'text':
      return node.props.text;
    case 'icon':
      return node.props.label || node.props.icon;
    case 'input':
      return node.props.label;
    case 'checkbox':
      return node.props.label;
    case 'radio':
      return node.props.label;
    case 'switch':
      return node.props.label;
    case 'dropdown':
      return node.props.label;
    case 'slider':
      return node.props.label;
    case 'progress':
      return node.props.label;
    case 'divider':
      return node.props.orientation;
    case 'camera':
      return node.props.label;
    case 'file-input':
      return node.props.label;
    case 'chat':
      return node.props.title;
    case 'chart':
      return node.props.title || `${node.props.chartType} chart`;
    case 'image':
      return node.props.alt.length > 0 ? node.props.alt : 'Untitled image';
    case 'listview':
      return node.props.dataSource.kind === 'collection' ? 'Collection ListView' : 'ListView';
    case 'container':
      return 'Frame';
    case 'gesture-detector':
      return node.props.semanticLabel || 'Tap area';
    case 'column':
      return 'Column';
    case 'row':
      return 'Row';
  }
}

/** Unambiguous accessible name, e.g. "Button — Click me". */
export function nodeLayerName(node: ComponentNode): string {
  return `${NODE_TYPE_LABELS[node.type]} — ${nodeDisplayLabel(node)}`;
}
