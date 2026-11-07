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
  | 'repeater'
  | 'form'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'dropdown'
  | 'slider'
  | 'progress'
  | 'divider'
  | 'camera';

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

export interface RepeaterProps {
  emptyText: string;
  showDividers: boolean;
  dataSource?:
    | { kind: 'static'; items: string[] }
    | {
        kind: 'collection';
        collectionId: string;
        displayFieldIds: string[];
        sortFieldId?: string;
        sortDirection?: 'asc' | 'desc';
        searchFieldId?: string;
        searchComponentId?: string;
      };
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

export interface CameraProps {
  label: string;
  facingMode: 'user' | 'environment';
  captureLabel: string;
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

export type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop';

/** Typed, provider-agnostic visual overrides persisted with a component. */
export interface ComponentAppearance {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  opacity?: number;
}

/** Mobile uses the base geometry; larger web breakpoints may override individual values. */
export interface ResponsiveNodeOverrides extends Partial<NodeGeometry> {
  /** Optional breakpoint-specific visibility; omitted values inherit the previous breakpoint. */
  isHidden?: boolean;
}

export type ResponsiveGeometry = Partial<
  Record<Exclude<ResponsiveBreakpoint, 'mobile'>, ResponsiveNodeOverrides>
>;

export interface NodeBase extends NodeGeometry {
  id: string;
  /** Optional editor-facing name; old documents derive a label from content. */
  name?: string;
  /** Hidden layers stay in the document but do not render on canvas/preview. */
  isHidden?: boolean;
  /** Locked layers remain selectable from Layers but ignore direct canvas manipulation. */
  isLocked?: boolean;
  /** Optional visual overrides shared by editor, preview, thumbnails, and generated-app JSON. */
  appearance?: ComponentAppearance;
  /** Optional tablet/desktop geometry; omitted values inherit the mobile/base geometry. */
  responsive?: ResponsiveGeometry;
}

export function geometryAtBreakpoint(
  node: NodeBase,
  breakpoint: ResponsiveBreakpoint,
): NodeGeometry {
  const base = { x: node.x, y: node.y, w: node.w, h: node.h };
  if (breakpoint === 'mobile') {
    return base;
  }
  const tabletOverride = node.responsive?.tablet ?? {};
  const tablet = {
    x: tabletOverride.x ?? base.x,
    y: tabletOverride.y ?? base.y,
    w: tabletOverride.w ?? base.w,
    h: tabletOverride.h ?? base.h,
  };
  if (breakpoint === 'tablet') {
    return tablet;
  }
  const desktopOverride = node.responsive?.desktop ?? {};
  return {
    x: desktopOverride.x ?? tablet.x,
    y: desktopOverride.y ?? tablet.y,
    w: desktopOverride.w ?? tablet.w,
    h: desktopOverride.h ?? tablet.h,
  };
}

/** Cascading visibility: Mobile base → Tablet override → Desktop override. */
export function isHiddenAtBreakpoint(
  node: NodeBase,
  breakpoint: ResponsiveBreakpoint,
): boolean {
  const mobileHidden = node.isHidden === true;
  if (breakpoint === 'mobile') {
    return mobileHidden;
  }
  const tabletHidden = node.responsive?.tablet?.isHidden;
  const tabletResolved = tabletHidden ?? mobileHidden;
  if (breakpoint === 'tablet') {
    return tabletResolved;
  }
  const desktopHidden = node.responsive?.desktop?.isHidden;
  return desktopHidden ?? tabletResolved;
}

/** Alias kept for callers that phrase visibility as “visible”. */
export function isVisibleAtBreakpoint(
  node: NodeBase,
  breakpoint: ResponsiveBreakpoint,
): boolean {
  return !isHiddenAtBreakpoint(node, breakpoint);
}

/** Alias for tests/docs that use a shorter visibility resolver name. */
export const hiddenAtBreakpoint = isHiddenAtBreakpoint;
/** Alias for callers that expect a generic visibility resolver. Returns hidden state. */
export const visibilityAtBreakpoint = isHiddenAtBreakpoint;

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

export interface RepeaterNode extends NodeBase {
  type: 'repeater';
  props: RepeaterProps;
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

export interface CameraNode extends NodeBase {
  type: 'camera';
  props: CameraProps;
}

export type ComponentNode =
  | ButtonNode
  | TextNode
  | InputNode
  | ImageNode
  | ContainerNode
  | ListNode
  | RepeaterNode
  | FormNode
  | CheckboxNode
  | RadioNode
  | SwitchNode
  | DropdownNode
  | SliderNode
  | ProgressNode
  | DividerNode
  | CameraNode;

/** Frames may nest any supported component, including another frame. */
export const CONTAINER_CHILD_TYPES: readonly ComponentType[] = [
  'button',
  'text',
  'input',
  'image',
  'list',
  'repeater',
  'container',
  'form',
  'checkbox',
  'radio',
  'switch',
  'dropdown',
  'slider',
  'progress',
  'divider',
  'camera',
];
