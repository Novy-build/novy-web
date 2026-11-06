/**
 * The component palette for the MVP editor. One union member per palette
 * entry; every node is absolutely positioned (free-form canvas, 8px snap).
 *
 * Container children carry coordinates relative to their parent container,
 * so moving a container keeps its content attached.
 */
export type ComponentType =
  | 'button'
  | 'text'
  | 'input'
  | 'image'
  | 'container'
  | 'list'
  | 'form'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'dropdown'
  | 'slider'
  | 'progress'
  | 'divider';

export interface ButtonProps {
  label: string;
  variant: 'solid' | 'outline' | 'text';
}

export interface TextProps {
  text: string;
  level: 'display' | 'title' | 'body';
}

export interface InputProps {
  label: string;
  placeholder: string;
  inputType: 'text' | 'email' | 'password' | 'number';
  multiline: boolean;
}

export interface ImageProps {
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
}

export interface ContainerProps {
  /* Visual styling is fixed for the MVP; reserved for future fill/radius specs. */
}

export interface ListProps {
  items: string[];
  scrollable: boolean;
  showDividers: boolean;
  dataSource?:
    | { kind: 'static' }
    | { kind: 'collection'; collectionId: string; displayFieldId: string };
}

export interface CheckboxProps {
  label: string;
  checked: boolean;
}

export interface RadioProps {
  label: string;
  options: string[];
  selectedIndex: number;
}

export interface SwitchProps {
  label: string;
  checked: boolean;
}

export interface DropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selectedIndex: number;
}

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface ProgressProps {
  label: string;
  value: number;
  indeterminate: boolean;
}

export interface DividerProps {
  orientation: 'horizontal' | 'vertical';
  thickness: number;
}

export interface FormField {
  label: string;
  placeholder: string;
  type: 'text' | 'email' | 'number';
}

export interface FormProps {
  title: string;
  fields: FormField[];
  submitLabel: string;
  dataBinding?: {
    collectionId: string;
    fields: Array<{ formFieldIndex: number; dataFieldId: string }>;
  };
}

export interface NodeGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NodeBase extends NodeGeometry {
  id: string;
  /** Optional editor-facing name; old documents derive a label from content. */
  name?: string;
  /** Hidden layers stay in the document but do not render on canvas/preview. */
  isHidden?: boolean;
  /** Locked layers remain selectable from Layers but ignore direct canvas manipulation. */
  isLocked?: boolean;
}

export interface ButtonNode extends NodeBase {
  type: 'button';
  props: ButtonProps;
}

export interface TextNode extends NodeBase {
  type: 'text';
  props: TextProps;
}

export interface InputNode extends NodeBase {
  type: 'input';
  props: InputProps;
}

export interface ImageNode extends NodeBase {
  type: 'image';
  props: ImageProps;
}

export interface ContainerNode extends NodeBase {
  type: 'container';
  props: ContainerProps;
  children: ComponentNode[];
}

export interface ListNode extends NodeBase {
  type: 'list';
  props: ListProps;
}

export interface FormNode extends NodeBase {
  type: 'form';
  props: FormProps;
}

export interface CheckboxNode extends NodeBase {
  type: 'checkbox';
  props: CheckboxProps;
}

export interface RadioNode extends NodeBase {
  type: 'radio';
  props: RadioProps;
}

export interface SwitchNode extends NodeBase {
  type: 'switch';
  props: SwitchProps;
}

export interface DropdownNode extends NodeBase {
  type: 'dropdown';
  props: DropdownProps;
}

export interface SliderNode extends NodeBase {
  type: 'slider';
  props: SliderProps;
}

export interface ProgressNode extends NodeBase {
  type: 'progress';
  props: ProgressProps;
}

export interface DividerNode extends NodeBase {
  type: 'divider';
  props: DividerProps;
}

export type ComponentNode =
  | ButtonNode
  | TextNode
  | InputNode
  | ImageNode
  | ContainerNode
  | ListNode
  | FormNode
  | CheckboxNode
  | RadioNode
  | SwitchNode
  | DropdownNode
  | SliderNode
  | ProgressNode
  | DividerNode;

/** Frames may nest any supported component, including another frame. */
export const CONTAINER_CHILD_TYPES: readonly ComponentType[] = [
  'button',
  'text',
  'input',
  'image',
  'list',
  'container',
  'form',
  'checkbox',
  'radio',
  'switch',
  'dropdown',
  'slider',
  'progress',
  'divider',
];
