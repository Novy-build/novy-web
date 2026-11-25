import type { DataFieldType, DataValue } from './appData';

/**
 * The component palette for the MVP editor. One union member per palette
 * entry; every node is absolutely positioned (free-form canvas, 8px snap).
 *
 * Child-bearing widgets keep a nested component tree. Container is the
 * free-form frame; Column, Row, and ListView apply Flutter-style linear
 * composition to their children.
 */
export type ComponentType =
  | 'button'
  | 'text'
  | 'icon'
  | 'input'
  | 'image'
  | 'container'
  | 'gesture-detector'
  | 'column'
  | 'row'
  | 'listview'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'dropdown'
  | 'slider'
  | 'progress'
  | 'divider'
  | 'camera'
  | 'file-input'
  | 'chat'
  | 'chart';

/**
 * Curated Lucide icon names available to Button widgets. Keeping the set
 * explicit preserves a stable persisted vocabulary and bounds the renderer
 * bundle to icons the editor actually offers.
 */
export const BUTTON_ICON_NAMES = [
  'arrow-left',
  'arrow-right',
  'calendar',
  'check',
  'chevron-right',
  'download',
  'external-link',
  'heart',
  'mail',
  'pencil',
  'play',
  'plus',
  'save',
  'search',
  'share',
  'shopping-cart',
  'trash',
  'upload',
  'user',
] as const;

export type ButtonIconName = (typeof BUTTON_ICON_NAMES)[number];

export type ButtonIconPosition = 'left' | 'center' | 'right';

export function isButtonIconName(value: unknown): value is ButtonIconName {
  return typeof value === 'string' && (BUTTON_ICON_NAMES as readonly string[]).includes(value);
}

export interface ButtonProps {
  label: string;
  variant: 'solid' | 'outline' | 'text';
  /** Optional decorative icon rendered beside the label. */
  icon?: ButtonIconName;
  /** Omitted defaults to left; center renders an accessible icon-only button. */
  iconPosition?: ButtonIconPosition;
  /** Optional typography override for the button label. */
  textStyle?: InputTextStyle;
}

export interface TextProps {
  text: string;
  level: 'display' | 'title' | 'body';
  /** Optional CSS font-family override; omitted uses the app font stack. */
  fontFamily?: string;
  /** Optional pixel size override; omitted uses the level preset. */
  fontSize?: number;
  /** Optional weight override; omitted uses the level preset. */
  fontWeight?: TextFontWeight;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  lineClamp?: number;
}

export const TEXT_FONT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold'] as const;

export type TextFontWeight = (typeof TEXT_FONT_WEIGHTS)[number];

export function isTextFontWeight(value: unknown): value is TextFontWeight {
  return typeof value === 'string' && (TEXT_FONT_WEIGHTS as readonly string[]).includes(value);
}

export function isTextFontFamily(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Visual treatment shared by interactive form controls. */
export type FieldStyle = 'outline' | 'underline' | 'filled';

export const FIELD_STYLES: readonly FieldStyle[] = ['outline', 'underline', 'filled'];

/** Typography applied to the text entered into an Input (not its field label). */
export type InputTextStyle = Pick<
  TextProps,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'textAlign' | 'fontStyle' | 'textTransform'
>;

export interface InputProps {
  label: string;
  /** Optional typography override for the field label. */
  labelStyle?: InputTextStyle;
  /** Omitted preserves the legacy behavior of showing the field label. */
  showLabel?: boolean;
  placeholder: string;
  inputType: 'text' | 'email' | 'password' | 'number' | 'date';
  multiline: boolean;
  /** Omitted inherits the project design system's field style. */
  fieldStyle?: FieldStyle;
  /** Optional typography for the entered text; omitted uses the app font stack. */
  textStyle?: InputTextStyle;
}

export interface ImageProps {
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
}

export const APP_ICON_NAMES = [
  ...BUTTON_ICON_NAMES,
  'bell',
  'book-open',
  'box',
  'circle-user',
  'folder',
  'graduation-cap',
  'grid-2x2',
  'image',
  'layout-dashboard',
  'log-out',
  'menu',
  'message-square',
  'settings',
  'users',
  'video',
  'volume-2',
  'workflow',
] as const;

export type AppIconName = (typeof APP_ICON_NAMES)[number];

export function isAppIconName(value: unknown): value is AppIconName {
  return typeof value === 'string' && (APP_ICON_NAMES as readonly string[]).includes(value);
}

export interface IconProps {
  icon: AppIconName;
  /** Decorative icons use an empty label; meaningful icons require one. */
  label: string;
  strokeWidth: number;
}

export interface ContainerProps {
  /* Visual styling is fixed for the MVP; reserved for future fill/radius specs. */
}

/** Transparent interaction wrapper used to make a visual group tappable. */
export interface GestureDetectorProps {
  /** Accessible action name used by preview and generated applications. */
  semanticLabel: string;
}

export type MainAxisAlignment =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export type CrossAxisAlignment = 'start' | 'center' | 'end' | 'stretch';

export type PaddingMode = 'all' | 'symmetric' | 'only';

/** Per-side resolved padding in canvas pixels. */
export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Flutter-style padding configuration. All four sides stay stored so
 * switching between All, Symmetric, and Only never discards values.
 */
export interface PaddingValue extends EdgeInsets {
  mode: PaddingMode;
}

function normalizePaddingSide(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function inferPaddingMode(edges: EdgeInsets): PaddingMode {
  if (edges.top === edges.right && edges.right === edges.bottom && edges.bottom === edges.left) {
    return 'all';
  }
  if (edges.top === edges.bottom && edges.left === edges.right) {
    return 'symmetric';
  }
  return 'only';
}

export function createPadding(all: number): PaddingValue {
  const value = normalizePaddingSide(all);
  return { mode: 'all', top: value, right: value, bottom: value, left: value };
}

export function createSymmetricPadding(vertical: number, horizontal: number): PaddingValue {
  const verticalValue = normalizePaddingSide(vertical);
  const horizontalValue = normalizePaddingSide(horizontal);
  return {
    mode: 'symmetric',
    top: verticalValue,
    right: horizontalValue,
    bottom: verticalValue,
    left: horizontalValue,
  };
}

export function createEdgePadding(edges: Partial<EdgeInsets> & { mode?: PaddingMode } = {}): PaddingValue {
  const resolved: EdgeInsets = {
    top: normalizePaddingSide(edges.top ?? 0),
    right: normalizePaddingSide(edges.right ?? 0),
    bottom: normalizePaddingSide(edges.bottom ?? 0),
    left: normalizePaddingSide(edges.left ?? 0),
  };
  return { mode: edges.mode ?? inferPaddingMode(resolved), ...resolved };
}

/**
 * Accepts legacy numeric padding (schema v10 and older) as well as partial
 * desktop payloads. Returns a complete, non-negative padding value.
 */
export function normalizePadding(value: number | Partial<PaddingValue> | undefined): PaddingValue {
  if (typeof value === 'number') return createPadding(value);
  if (!value) return createPadding(0);
  const resolved: EdgeInsets = {
    top: normalizePaddingSide(value.top ?? 0),
    right: normalizePaddingSide(value.right ?? 0),
    bottom: normalizePaddingSide(value.bottom ?? 0),
    left: normalizePaddingSide(value.left ?? 0),
  };
  const mode = value.mode === 'all' || value.mode === 'symmetric' || value.mode === 'only'
    ? value.mode
    : inferPaddingMode(resolved);
  return { mode, ...resolved };
}

export function resolveEdgeInsets(value: number | Partial<PaddingValue> | undefined): EdgeInsets {
  const normalized = normalizePadding(value);
  return {
    top: normalized.top,
    right: normalized.right,
    bottom: normalized.bottom,
    left: normalized.left,
  };
}

export function isValidPadding(value: number | Partial<PaddingValue> | undefined): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
  if (!value) return true;
  return [value.top, value.right, value.bottom, value.left].every(
    (side) => side === undefined || (Number.isFinite(side) && side >= 0),
  );
}

export interface LinearLayoutProps {
  mainAxisAlignment: MainAxisAlignment;
  crossAxisAlignment: CrossAxisAlignment;
  gap: number;
  padding: PaddingValue;
}

export interface ColumnProps extends LinearLayoutProps {}

export interface RowProps extends LinearLayoutProps {}

export interface ListViewItemField {
  id: string;
  label: string;
  type: DataFieldType;
}

export interface StaticListViewItem {
  id: string;
  values: Record<string, DataValue>;
}

export interface StaticListViewDataSource {
  kind: 'static';
  fields: ListViewItemField[];
  items: StaticListViewItem[];
}

/**
 * Read-compatibility shape for projects saved before collection bindings moved
 * into Logic. The mapper converts this into a static source plus a
 * `load-list-items` action and never writes it back to canonical project JSON.
 */
export interface LegacyCollectionListViewDataSource {
  kind: 'collection';
  collectionId: string;
  displayFieldIds: string[];
  sortFieldId?: string;
  sortDirection?: 'asc' | 'desc';
  searchFieldId?: string;
  searchComponentId?: string;
}

export type ListViewDataSource = StaticListViewDataSource | LegacyCollectionListViewDataSource;

export interface ListViewProps {
  emptyText: string;
  showDividers: boolean;
  scrollDirection: 'vertical' | 'horizontal';
  crossAxisAlignment: CrossAxisAlignment;
  /** Gap between root widgets inside one repeated item template. */
  gap: number;
  /** Inset between an item's outer bounds and its template widgets. */
  padding: PaddingValue;
  /** Gap between repeated item containers. */
  itemSpacing: number;
  /** Corner radius applied to each repeated item container. */
  itemBorderRadius: number;
  /** Visual treatment applied to every repeated item container. */
  itemAppearance?: ComponentAppearance;
  /** Appearance of the selected row; requires selectionEnabled. */
  itemSelectedAppearance?: ComponentAppearance;
  /** Appearance of a row while pressed. */
  itemPressedAppearance?: ComponentAppearance;
  /** Opt-in row selection; selection never triggers a workflow. */
  selectionEnabled?: boolean;
  /** Overrides the theme hairline color for item dividers. */
  dividerColor?: string;
  /** Overrides the 1px divider thickness. */
  dividerThickness?: number;
  /** Visual treatment of the empty-state surface. */
  emptyStateAppearance?: ComponentAppearance;
  /** Typography of the empty-state text. */
  emptyStateTextStyle?: Partial<Omit<TextProps, 'text' | 'level'>>;
  /** Whether the scrollbar is always visible or only while scrolling. */
  scrollbarVisibility?: 'auto' | 'hidden';
  dataSource: ListViewDataSource;
}

export interface CheckboxProps {
  label: string;
  checked: boolean;
  fieldStyle?: FieldStyle;
}

export interface RadioProps {
  label: string;
  options: string[];
  selectedIndex: number;
}

export interface SwitchProps {
  label: string;
  checked: boolean;
  /** When enabled, this switch controls the previewed app's theme. */
  controlsTheme?: boolean;
  fieldStyle?: FieldStyle;
}

export interface DropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selectedIndex: number;
  /** Action menus emit the chosen option through the normal change event. */
  presentation?: 'select' | 'menu';
  fieldStyle?: FieldStyle;
  /** Font size in pixels for the Actions-menu trigger glyph; omitted uses the default. */
  menuIconSize?: number;
  /** Optional per-widget colors for the Actions-menu popup; omitted uses app theme tokens. */
  menuBackgroundColor?: string;
  menuTextColor?: string;
  menuHoverColor?: string;
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
  /** Optional hex color for the divider line; omitted uses the theme hairline. */
  color?: string;
}

export interface CameraProps {
  label: string;
  facingMode: 'user' | 'environment';
  captureLabel: string;
  /** Omitted legacy values preserve manual capture. */
  captureMode?: 'manual' | 'guided-face';
}

export interface FileInputProps {
  label: string;
  helperText: string;
  accept: string[];
}

export interface ChatControlStyle {
  kind: 'send' | 'input';
  width?: number;
  height?: number;
  appearance?: ComponentAppearance;
  textStyle?: InputTextStyle;
  variant?: 'solid' | 'outline' | 'text';
  fieldStyle?: FieldStyle;
}

export interface ChatStyle {
  headerTone: 'surface' | 'canvas' | 'primary' | 'muted';
  bubbleRadius: 'sharp' | 'soft' | 'rounded' | 'pill';
  userBubbleTone: 'primary' | 'accent' | 'surface' | 'canvas';
  assistantBubbleTone: 'surface' | 'canvas' | 'surface-elevated';
  composerTone: 'surface' | 'canvas' | 'surface-elevated';
  sendVariant: 'solid' | 'outline' | 'text';
  border: 'none' | 'subtle' | 'outlined';
  spacing: 'compact' | 'comfortable' | 'spacious';
  citationsTone: 'muted' | 'primary' | 'text';
  headerTextSize: 'small' | 'medium' | 'large';
  headerTextWeight: 'regular' | 'semibold' | 'bold';
  headerTextAlign: 'start' | 'center' | 'end';
  bubbleTextSize: 'small' | 'medium' | 'large';
  bubbleTextWeight: 'regular' | 'semibold' | 'bold';
  bubbleMaxWidth: 'compact' | 'normal' | 'wide';
  emptyTextSize: 'small' | 'medium' | 'large';
  emptyTextAlign: 'start' | 'center' | 'end';
  inputTextSize: 'small' | 'medium' | 'large';
  inputTextWeight: 'regular' | 'semibold' | 'bold';
  sendTextSize: 'small' | 'medium' | 'large';
  sendTextWeight: 'regular' | 'semibold' | 'bold';
  sendButton?: ChatControlStyle;
  composerInput?: ChatControlStyle;
}

export const DEFAULT_CHAT_STYLE: ChatStyle = {
  headerTone: 'surface',
  bubbleRadius: 'soft',
  userBubbleTone: 'primary',
  assistantBubbleTone: 'surface',
  composerTone: 'surface',
  sendVariant: 'solid',
  border: 'subtle',
  spacing: 'comfortable',
  citationsTone: 'muted',
  headerTextSize: 'medium',
  headerTextWeight: 'bold',
  headerTextAlign: 'start',
  bubbleTextSize: 'medium',
  bubbleTextWeight: 'regular',
  bubbleMaxWidth: 'normal',
  emptyTextSize: 'small',
  emptyTextAlign: 'center',
  inputTextSize: 'medium',
  inputTextWeight: 'regular',
  sendTextSize: 'medium',
  sendTextWeight: 'semibold',
  sendButton: { kind: 'send', width: 120, height: 36 },
  composerInput: { kind: 'input', height: 36 },
};

export interface ChatProps {
  title: string;
  placeholder: string;
  sendLabel: string;
  emptyText: string;
  showCitations: boolean;
  fieldStyle?: FieldStyle;
  style?: ChatStyle;
}

export const CHART_TYPES = ['bar', 'line', 'pie'] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export function isChartType(value: unknown): value is ChartType {
  return typeof value === 'string' && (CHART_TYPES as readonly string[]).includes(value);
}

/** Bounded series/category counts keep persisted charts and generated output small. */
export const MAX_CHART_CATEGORIES = 24;
export const MAX_CHART_SERIES = 6;
export const MAX_CHART_PALETTE = 12;

/** Theme-agnostic fallback palette; validated hex colors only. */
export const DEFAULT_CHART_PALETTE: readonly string[] = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
];

export interface ChartStaticSeries {
  id: string;
  label: string;
  /** Optional validated hex color; omitted falls back to the chart palette. */
  color?: string;
  /** One numeric value per category. */
  values: number[];
}

export interface ChartDataSource {
  kind: 'static';
  categories: string[];
  series: ChartStaticSeries[];
}

export interface ChartProps {
  title: string;
  chartType: ChartType;
  dataSource: ChartDataSource;
  showLegend: boolean;
  showGrid: boolean;
  showValues: boolean;
  emptyText: string;
  palette: string[];
}

export interface NodeGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop';

/** Persisted outline style for layout frames. */
export type ComponentBorderStyle = 'solid' | 'dashed' | 'none';

/** One independently styled edge. Omitted values inherit the shared border settings. */
export interface BorderSideAppearance {
  width?: number;
  style?: ComponentBorderStyle;
  color?: string;
}

export interface BorderSides {
  top?: BorderSideAppearance;
  right?: BorderSideAppearance;
  bottom?: BorderSideAppearance;
  left?: BorderSideAppearance;
}

export interface GradientStop {
  color: string;
  position: number;
}

export interface LinearGradientFill {
  angle: number;
  stops: GradientStop[];
}

export interface BoxShadowEffect {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset?: boolean;
}

export interface ThemeAppearanceOverride {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  gradient?: LinearGradientFill;
  boxShadows?: BoxShadowEffect[];
}

/** Typed, provider-agnostic visual overrides persisted with a component. */
export interface ComponentAppearance {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  /** Omitted keeps the existing solid-if-colored border behavior. */
  borderStyle?: ComponentBorderStyle;
  /** Optional border width in pixels; omitted keeps the component default. */
  borderWidth?: number;
  /** Per-edge overrides applied after the shared border settings. */
  borderSides?: BorderSides;
  borderRadius?: number;
  opacity?: number;
  /** Typed gradient wins over backgroundColor when present. */
  gradient?: LinearGradientFill;
  /** Bounded visual effects; multiple entries enable elevation plus glow. */
  boxShadows?: BoxShadowEffect[];
  backdropBlur?: number;
  /** Omitted retains the legacy behavior of clipping rounded components. */
  clipContent?: boolean;
  /** Optional dark-theme color overrides; omitted colors inherit base appearance. */
  dark?: ThemeAppearanceOverride;
}

/** Mobile uses the base geometry; larger web breakpoints may override individual values. */
export interface ResponsiveNodeOverrides extends Partial<NodeGeometry> {
  /** Optional breakpoint-specific visibility; omitted values inherit the previous breakpoint. */
  isHidden?: boolean;
  /** Optional breakpoint-specific styling, cascading after base appearance. */
  appearance?: ComponentAppearance;
  /** Optional breakpoint-specific typography for Text nodes. */
  textStyle?: Partial<Omit<TextProps, 'text' | 'level'>>;
}

export type ResponsiveGeometry = Partial<
  Record<Exclude<ResponsiveBreakpoint, 'mobile'>, ResponsiveNodeOverrides>
>;

export type ComponentBindingTarget =
  | 'text.content'
  | 'image.source'
  | 'image.alt'
  | 'button.label'
  | 'input.value'
  | 'dropdown.value'
  | 'checkbox.checked'
  | 'switch.checked'
  | 'progress.value'
  | 'component.visible';

export interface ListItemFieldBinding {
  source: 'list-item';
  fieldId: string;
}

export interface ComponentPropertyBinding {
  target: ComponentBindingTarget;
  value: ListItemFieldBinding;
}

export interface NodeBase extends NodeGeometry {
  id: string;
  /** Optional editor-facing name; old documents derive a label from content. */
  name?: string;
  /** Hidden layers stay in the document but do not render on canvas/preview. */
  isHidden?: boolean;
  /** Locked layers remain selectable from Layers but ignore direct canvas manipulation. */
  isLocked?: boolean;
  /** Optional reference to a reusable style in the project design system. */
  styleId?: string;
  /** Optional visual overrides shared by editor, preview, thumbnails, and generated-app JSON. */
  appearance?: ComponentAppearance;
  /** Optional tablet/desktop geometry; omitted values inherit the mobile/base geometry. */
  responsive?: ResponsiveGeometry;
  /** Typed dynamic properties resolved from the nearest repeated ListView item. */
  bindings?: ComponentPropertyBinding[];
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

export interface IconNode extends NodeBase {
  type: 'icon';
  props: IconProps;
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

export interface GestureDetectorNode extends NodeBase {
  type: 'gesture-detector';
  props: GestureDetectorProps;
  children: ComponentNode[];
}

export interface ColumnNode extends NodeBase {
  type: 'column';
  props: ColumnProps;
  children: ComponentNode[];
}

export interface RowNode extends NodeBase {
  type: 'row';
  props: RowProps;
  children: ComponentNode[];
}

export interface ListViewNode extends NodeBase {
  type: 'listview';
  props: ListViewProps;
  /** Item-template widgets repeated for static values or collection records. */
  children: ComponentNode[];
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

export interface FileInputNode extends NodeBase {
  type: 'file-input';
  props: FileInputProps;
}

export interface ChatNode extends NodeBase {
  type: 'chat';
  props: ChatProps;
}

export interface ChartNode extends NodeBase {
  type: 'chart';
  props: ChartProps;
}

export type ComponentNode =
  | ButtonNode
  | TextNode
  | IconNode
  | InputNode
  | ImageNode
  | ContainerNode
  | GestureDetectorNode
  | ColumnNode
  | RowNode
  | ListViewNode
  | CheckboxNode
  | RadioNode
  | SwitchNode
  | DropdownNode
  | SliderNode
  | ProgressNode
  | DividerNode
  | CameraNode
  | FileInputNode
  | ChatNode
  | ChartNode;

export type ChildBearingNode = ContainerNode | GestureDetectorNode | ColumnNode | RowNode | ListViewNode;

export function isChildBearingNode(node: ComponentNode): node is ChildBearingNode {
  return node.type === 'container' || node.type === 'gesture-detector' || node.type === 'column' || node.type === 'row' || node.type === 'listview';
}

export function isLinearLayoutNode(node: ComponentNode): node is ColumnNode | RowNode | ListViewNode {
  return node.type === 'column' || node.type === 'row' || node.type === 'listview';
}

/** Row and Column lay their children out along a main axis; ListView and Container
 *  keep free-form child coordinates. Use this to decide whether sibling arrays
 *  should be shown/inserted in layout order rather than z order. */
export function isMainAxisLayoutNode(node: ComponentNode): node is ColumnNode | RowNode {
  return node.type === 'column' || node.type === 'row';
}

/** Resolves the visual geometry of nested widgets inside a free-form or linear parent. */
export function childGeometriesAtBreakpoint(
  parent: ChildBearingNode,
  breakpoint: ResponsiveBreakpoint,
  parentGeometryOverride?: NodeGeometry,
): ReadonlyMap<string, NodeGeometry> {
  // A ListView repeats one free-form item frame. Its direct children retain
  // persisted coordinates just like Container children; Row/Column widgets
  // nested inside that frame still resolve their own linear auto-layout.
  if (parent.type === 'container' || parent.type === 'gesture-detector' || parent.type === 'listview') {
    return new Map(parent.children.map((child) => [child.id, geometryAtBreakpoint(child, breakpoint)]));
  }

  const parentGeometry = parentGeometryOverride ?? geometryAtBreakpoint(parent, breakpoint);
  const direction = parent.type === 'row' ? 'horizontal' : 'vertical';
  const padding = resolveEdgeInsets(parent.props.padding);
  const mainStart = direction === 'vertical' ? padding.top : padding.left;
  const mainEnd = direction === 'vertical' ? padding.bottom : padding.right;
  const crossStart = direction === 'vertical' ? padding.left : padding.top;
  const crossEnd = direction === 'vertical' ? padding.right : padding.bottom;
  const baseGap = Math.max(0, parent.props.gap);
  const visibleChildren = parent.children.filter((child) => !isHiddenAtBreakpoint(child, breakpoint));
  const mainSize = direction === 'vertical' ? parentGeometry.h : parentGeometry.w;
  const crossSize = direction === 'vertical' ? parentGeometry.w : parentGeometry.h;
  const childMainSizes = visibleChildren.map((child) => {
    const geometry = geometryAtBreakpoint(child, breakpoint);
    return direction === 'vertical' ? geometry.h : geometry.w;
  });
  const occupied = childMainSizes.reduce((total, size) => total + size, 0)
    + baseGap * Math.max(0, visibleChildren.length - 1);
  const remaining = Math.max(0, mainSize - mainStart - mainEnd - occupied);
  const mainAlignment = parent.props.mainAxisAlignment;
  let mainOffset = 0;
  let gap = baseGap;
  if (mainAlignment === 'center') mainOffset = remaining / 2;
  if (mainAlignment === 'end') mainOffset = remaining;
  if (mainAlignment === 'space-between' && visibleChildren.length > 1) gap += remaining / (visibleChildren.length - 1);
  if (mainAlignment === 'space-around' && visibleChildren.length > 0) {
    const distributed = remaining / visibleChildren.length;
    mainOffset = distributed / 2;
    gap += distributed;
  }
  if (mainAlignment === 'space-evenly' && visibleChildren.length > 0) {
    const distributed = remaining / (visibleChildren.length + 1);
    mainOffset = distributed;
    gap += distributed;
  }

  const resolved = new Map<string, NodeGeometry>();
  let cursor = mainStart + mainOffset;
  for (const child of parent.children) {
    const geometry = geometryAtBreakpoint(child, breakpoint);
    if (isHiddenAtBreakpoint(child, breakpoint)) {
      resolved.set(child.id, geometry);
      continue;
    }
    const childCross = direction === 'vertical' ? geometry.w : geometry.h;
    const availableCross = Math.max(0, crossSize - crossStart - crossEnd);
    let crossOffset = crossStart;
    if (parent.props.crossAxisAlignment === 'center') crossOffset += Math.max(0, availableCross - childCross) / 2;
    if (parent.props.crossAxisAlignment === 'end') crossOffset += Math.max(0, availableCross - childCross);
    const stretchedCross = parent.props.crossAxisAlignment === 'stretch' ? availableCross : childCross;
    resolved.set(child.id, direction === 'vertical'
      ? { x: crossOffset, y: cursor, w: stretchedCross, h: geometry.h }
      : { x: cursor, y: crossOffset, w: geometry.w, h: stretchedCross });
    cursor += (direction === 'vertical' ? geometry.h : geometry.w) + gap;
  }
  return resolved;
}

/**
 * Computes the repeated item's main-axis extent for a ListView, using the same
 * child geometries that the renderer resolves. Returns the default empty-item
 * extent when the template has no children.
 */
export function listViewItemExtent(
  node: ListViewNode,
  geometries: ReadonlyMap<string, NodeGeometry>,
  breakpoint: ResponsiveBreakpoint,
): number {
  if (node.children.length === 0) return 44;
  const horizontal = node.props.scrollDirection === 'horizontal';
  const padding = resolveEdgeInsets(node.props.padding);
  const contentStart = horizontal ? padding.left : padding.top;
  const contentEnd = horizontal ? padding.right : padding.bottom;
  return Math.max(
    1,
    contentStart + contentEnd,
    ...node.children.map((child) => {
      const geometry = geometries.get(child.id) ?? geometryAtBreakpoint(child, breakpoint);
      const childEnd = horizontal ? geometry.x + geometry.w : geometry.y + geometry.h;
      return childEnd + contentEnd;
    }),
  );
}

export function listViewItemExtentAtBreakpoint(node: ListViewNode, breakpoint: ResponsiveBreakpoint): number {
  return listViewItemExtent(node, childGeometriesAtBreakpoint(node, breakpoint), breakpoint);
}

/** Child-bearing widgets may nest any supported component, including each other. */
export const CHILD_WIDGET_TYPES: readonly ComponentType[] = [
  'button',
  'text',
  'icon',
  'input',
  'image',
  'container',
  'gesture-detector',
  'column',
  'row',
  'listview',
  'checkbox',
  'radio',
  'switch',
  'dropdown',
  'slider',
  'progress',
  'divider',
  'camera',
  'file-input',
  'chat',
  'chart',
];
