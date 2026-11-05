/**
 * The component palette for the MVP editor. One union member per palette
 * entry; every node is absolutely positioned (free-form canvas, 8px snap).
 *
 * Container children carry coordinates relative to their parent container,
 * so moving a container keeps its content attached.
 */
export type ComponentType = 'button' | 'text' | 'input' | 'image' | 'container' | 'list' | 'form';

export interface ButtonProps {
  label: string;
  variant: 'solid' | 'outline';
}

export interface TextProps {
  text: string;
  level: 'display' | 'title' | 'body';
}

export interface InputProps {
  label: string;
  placeholder: string;
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
  dataSource?:
    | { kind: 'static' }
    | { kind: 'collection'; collectionId: string; displayFieldId: string };
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

export type ComponentNode =
  | ButtonNode
  | TextNode
  | InputNode
  | ImageNode
  | ContainerNode
  | ListNode
  | FormNode;

/** Frames may nest any supported component, including another frame. */
export const CONTAINER_CHILD_TYPES: readonly ComponentType[] = [
  'button',
  'text',
  'input',
  'image',
  'list',
  'container',
  'form',
];
