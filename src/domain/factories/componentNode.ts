import type {
  ButtonNode,
  CheckboxNode,
  ComponentNode,
  ComponentType,
  ContainerNode,
  GestureDetectorNode,
  ColumnNode,
  CameraNode,
  ChartNode,
  ChatNode,
  DividerNode,
  FileInputNode,
  DropdownNode,
  ImageNode,
  IconNode,
  InputNode,
  ListViewNode,
  ProgressNode,
  RowNode,
  RadioNode,
  SliderNode,
  SwitchNode,
  TextNode,
} from '../entities/componentNode';
import { createPadding, DEFAULT_CHART_PALETTE } from '../entities/componentNode';
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
    props: { label: 'Label', placeholder: 'Enter value', inputType: 'text', multiline: false },
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

function createColumnNode(): ColumnNode {
  return {
    id: generateId('node'),
    type: 'column',
    x: 24,
    y: 24,
    w: 320,
    h: 240,
    props: { mainAxisAlignment: 'start', crossAxisAlignment: 'stretch', gap: 12, padding: createPadding(0) },
    children: [],
  };
}

function createIconNode(): IconNode {
  return {
    id: generateId('node'),
    type: 'icon',
    x: 24,
    y: 24,
    w: 44,
    h: 44,
    props: { icon: 'box', label: '', strokeWidth: 1.75 },
  };
}

function createGestureDetectorNode(): GestureDetectorNode {
  return {
    id: generateId('node'),
    type: 'gesture-detector',
    x: 24,
    y: 24,
    w: 320,
    h: 120,
    props: { semanticLabel: 'Open item' },
    children: [],
  };
}

function createRowNode(): RowNode {
  return {
    id: generateId('node'),
    type: 'row',
    x: 24,
    y: 24,
    w: 320,
    h: 96,
    props: { mainAxisAlignment: 'start', crossAxisAlignment: 'center', gap: 12, padding: createPadding(0) },
    children: [],
  };
}

function createListViewNode(): ListViewNode {
  return {
    id: generateId('node'),
    type: 'listview',
    x: 24,
    y: 24,
    w: 320,
    h: 240,
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
        items: [],
      },
    },
    children: [],
  };
}

function createCheckboxNode(): CheckboxNode {
  return {
    id: generateId('node'),
    type: 'checkbox',
    x: 24,
    y: 24,
    w: 220,
    h: 32,
    props: { label: 'Accept terms', checked: false },
  };
}

function createRadioNode(): RadioNode {
  return {
    id: generateId('node'),
    type: 'radio',
    x: 24,
    y: 24,
    w: 240,
    h: 96,
    props: { label: 'Choose one', options: ['Option A', 'Option B'], selectedIndex: 0 },
  };
}

function createSwitchNode(): SwitchNode {
  return {
    id: generateId('node'),
    type: 'switch',
    x: 24,
    y: 24,
    w: 220,
    h: 32,
    props: { label: 'Enable notifications', checked: false },
  };
}

function createDropdownNode(): DropdownNode {
  return {
    id: generateId('node'),
    type: 'dropdown',
    x: 24,
    y: 24,
    w: 260,
    h: 44,
    props: { label: 'Choose', placeholder: 'Select an option', options: ['Option A', 'Option B'], selectedIndex: -1 },
  };
}

function createSliderNode(): SliderNode {
  return {
    id: generateId('node'),
    type: 'slider',
    x: 24,
    y: 24,
    w: 280,
    h: 48,
    props: { label: 'Volume', min: 0, max: 100, step: 1, value: 50 },
  };
}

function createProgressNode(): ProgressNode {
  return {
    id: generateId('node'),
    type: 'progress',
    x: 24,
    y: 24,
    w: 280,
    h: 32,
    props: { label: 'Loading', value: 40, indeterminate: false },
  };
}

function createCameraNode(): CameraNode {
  return {
    id: generateId('node'),
    type: 'camera',
    x: 24,
    y: 24,
    w: 320,
    h: 220,
    props: { label: 'Camera', facingMode: 'user', captureLabel: 'Capture' },
  };
}

function createFileInputNode(): FileInputNode {
  return {
    id: generateId('node'),
    type: 'file-input',
    x: 24,
    y: 24,
    w: 320,
    h: 104,
    props: {
      label: 'Upload document',
      helperText: 'Text, Markdown, HTML, or PDF up to 5 MB',
      accept: ['text/plain', 'text/markdown', 'text/html', 'application/pdf'],
    },
  };
}

function createChatNode(): ChatNode {
  return {
    id: generateId('node'),
    type: 'chat',
    x: 24,
    y: 24,
    w: 342,
    h: 520,
    props: {
      title: 'Ask your document',
      placeholder: 'Type a question…',
      sendLabel: 'Send',
      emptyText: 'Ask a question to start the conversation.',
      showCitations: true,
    },
  };
}

function createChartNode(): ChartNode {
  return {
    id: generateId('node'),
    type: 'chart',
    x: 24,
    y: 24,
    w: 360,
    h: 260,
    props: {
      title: 'Chart title',
      chartType: 'bar',
      dataSource: {
        kind: 'static',
        categories: ['Jan', 'Feb', 'Mar', 'Apr'],
        series: [
          { id: generateId('series'), label: 'Series 1', values: [12, 19, 8, 15] },
        ],
      },
      showLegend: true,
      showGrid: true,
      showValues: false,
      emptyText: 'No chart data yet',
      palette: [...DEFAULT_CHART_PALETTE],
    },
  };
}

function createDividerNode(): DividerNode {
  return {
    id: generateId('node'),
    type: 'divider',
    x: 24,
    y: 24,
    w: 280,
    h: 16,
    props: { orientation: 'horizontal', thickness: 1 },
  };
}

interface NodeFactory {
  (): ComponentNode;
}

const factories: Record<ComponentType, NodeFactory> = {
  button: createButtonNode,
  text: createTextNode,
  icon: createIconNode,
  input: createInputNode,
  image: createImageNode,
  container: createContainerNode,
  'gesture-detector': createGestureDetectorNode,
  column: createColumnNode,
  row: createRowNode,
  listview: createListViewNode,
  checkbox: createCheckboxNode,
  radio: createRadioNode,
  switch: createSwitchNode,
  dropdown: createDropdownNode,
  slider: createSliderNode,
  progress: createProgressNode,
  camera: createCameraNode,
  'file-input': createFileInputNode,
  chat: createChatNode,
  divider: createDividerNode,
  chart: createChartNode,
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
