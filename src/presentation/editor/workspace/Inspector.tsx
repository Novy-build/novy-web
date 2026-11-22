import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { FieldHelpLabel } from '@presentation/components/ui/FieldHelp';
import type {
  BorderSides,
  CameraProps,
  ComponentNode,
  ComponentBindingTarget,
  CrossAxisAlignment,
  DividerProps,
  FieldStyle,
  InputProps,
  MainAxisAlignment,
  ListViewItemField,
  ListViewNode,
  ResponsiveBreakpoint,
  StaticListViewItem,
  TextProps,
} from '@domain/entities/componentNode';
import { FIELD_STYLES, geometryAtBreakpoint, isAppIconName, isButtonIconName, isTextFontWeight } from '@domain/entities/componentNode';
import {
  RECORD_IDENTIFIER_KEY_PATTERN,
  recordIdentifierForCollection,
  type DataCollection,
  type DataFieldType,
  type DataValue,
} from '@domain/entities/appData';
import { bindingTargetsForComponent, isFieldTypeCompatible } from '@domain/bindings/componentBindings';
import type { Behavior } from '@domain/entities/logic';
import { TextInput } from '@presentation/components/ui/TextInput';
import { Modal } from '@presentation/components/system/Modal';
import { generateId } from '@domain/ids';
import type { EditorAction } from '../state/editorState';
import { NODE_TYPE_LABELS } from './nodeLabels';
import { PaddingField } from './PaddingField';
import { ColorField } from './ColorField';
import { BUTTON_ICON_OPTIONS } from '../renderer/nodes/buttonIcons';
import { APP_ICON_OPTIONS } from '../renderer/nodes/appIcons';
import { TEXT_FONT_WEIGHT_OPTIONS } from '../renderer/nodes/textTypography';
import { TRIGGER_EVENT_LABELS } from '../logic/behaviorLabels';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import { colorTokenCssValue, normalizeDesignSystem } from '@domain/entities/designSystem';
import type { Screen } from '@domain/entities/screen';
import { ChartInspector } from './ChartInspector';
import { DesignSystemInspector } from './DesignSystemInspector';
import { FontFamilyPicker } from './FontFamilyPicker';
import { InspectorSection } from './InspectorSection';

interface InspectorProps {
  node: ComponentNode | null;
  /** All behaviors of the active screen, filtered for the selected node. */
  behaviors: readonly Behavior[];
  onAction: (action: EditorAction) => void;
  onOpenLogic: () => void;
  collections?: readonly DataCollection[];
  device?: ResponsiveBreakpoint;
  listItemFields?: readonly ListItemBindingField[];
  /** Human-readable name of the collection or manual item source being bound. */
  listItemSourceName?: string;
  itemFrame?: ListViewNode | null;
  itemCollection?: DataCollection | null;
  recordRoutePaths?: readonly string[];
  onRecordIdentifierChange?: (collectionId: string, key: string) => Promise<void>;
  onEditItemTemplate?: (listViewId: string) => void;
  designSystem?: AppDesignSystem;
  screen?: Screen;
}

export interface ListItemBindingField {
  id: string;
  label: string;
  type: DataFieldType;
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

function FieldStyleControl({
  value,
  onChange,
}: {
  value: FieldStyle | undefined;
  onChange: (value: FieldStyle) => void;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-ink-muted">Field style</span>
      <SegmentedControl
        ariaLabel="Field style"
        onChange={onChange}
        options={FIELD_STYLES.map((style) => ({
          value: style,
          label: style === 'outline' ? 'Outline' : style === 'underline' ? 'Underline' : 'Filled',
        }))}
        value={value ?? 'outline'}
      />
    </div>
  );
}

function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div aria-label={ariaLabel} className="inline-flex gap-1 rounded-tile bg-canvas p-0.5" role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className={`rounded-tile px-2.5 py-1 text-xs font-medium transition-colors ${
            option.value === value ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const FIELD_TYPE_LABELS: Readonly<Record<DataFieldType, string>> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Yes/No',
  date: 'Date',
};

interface BindingControlCopy {
  label: string;
  unboundLabel: string;
  incompatibleHint: string;
}

const BINDING_CONTROL_COPY: Readonly<Record<ComponentBindingTarget, BindingControlCopy>> = {
  'text.content': {
    label: 'Text content',
    unboundLabel: 'Fixed text',
    incompatibleHint: 'Add a Text, Number, Yes/No, or Date field to bind text per item.',
  },
  'image.source': {
    label: 'Image source',
    unboundLabel: 'Fixed image',
    incompatibleHint: 'Add a Text field containing image URLs to bind images per item.',
  },
  'image.alt': {
    label: 'Alternative text',
    unboundLabel: 'Fixed text',
    incompatibleHint: 'Add a Text field to describe images per item.',
  },
  'button.label': {
    label: 'Button label',
    unboundLabel: 'Fixed label',
    incompatibleHint: 'Add a Text or Number field to label buttons per item.',
  },
  'input.value': {
    label: 'Input value',
    unboundLabel: 'Empty input',
    incompatibleHint: 'Add a Text, Number, or Date field to prefill this input per item.',
  },
  'dropdown.value': {
    label: 'Selected option',
    unboundLabel: 'No selection',
    incompatibleHint: 'Add a Text, Number, or Date field to select an option per item.',
  },
  'checkbox.checked': {
    label: 'Checked state',
    unboundLabel: 'Fixed state',
    incompatibleHint: 'Add a Yes/No field to control this per item.',
  },
  'switch.checked': {
    label: 'Checked state',
    unboundLabel: 'Fixed state',
    incompatibleHint: 'Add a Yes/No field to control this per item.',
  },
  'progress.value': {
    label: 'Progress value',
    unboundLabel: 'Fixed value',
    incompatibleHint: 'Add a Number field to set progress per item.',
  },
  'component.visible': {
    label: 'Visibility',
    unboundLabel: 'Always visible',
    incompatibleHint: 'Add a Yes/No field to show or hide this per item.',
  },
};

function PropertyBindingControls({
  node,
  fields,
  sourceName,
  onChange,
}: {
  node: ComponentNode;
  fields: readonly ListItemBindingField[];
  sourceName?: string;
  onChange: (target: ComponentBindingTarget, fieldId: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 border-t border-hairline pt-4">
      <p className="inspector-section-label">
        Item data{sourceName ? ` · ${sourceName}` : ''}
      </p>
      <p className="text-xs text-ink-muted">Choose a field from each item, or keep a fixed value.</p>
      {bindingTargetsForComponent(node.type).map((definition) => {
        const copy = BINDING_CONTROL_COPY[definition.target];
        const compatibleFields = fields.filter((field) => isFieldTypeCompatible(definition.target, field.type));
        const selectedFieldId = node.bindings?.find((binding) => binding.target === definition.target)?.value.fieldId ?? '';
        return compatibleFields.length > 0 ? (
          <label className="grid gap-1 text-xs font-medium text-ink-muted" key={definition.target}>
           <FieldHelpLabel label={copy.label} />
            <select
              className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
              onChange={(event) => onChange(definition.target, event.target.value)}
              value={selectedFieldId}
            >
              <option value="">{copy.unboundLabel}</option>
              {compatibleFields.map((field) => (
                <option key={field.id} value={field.id}>{field.label} ({FIELD_TYPE_LABELS[field.type]})</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-1 text-xs" key={definition.target}>
            <p className="font-medium text-ink-muted">{copy.label}</p>
            <p className="text-sm text-ink">{copy.unboundLabel}</p>
            <p className="text-ink-muted">{copy.incompatibleHint}</p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Right-rail properties panel: content fields per component type, X/Y/W/H
 * layout, appearance controls, and the behavior stub that hands off to Logic
 * mode. Every edit dispatches a typed reducer action through `onAction`.
 */
export function Inspector({
  node: candidate,
  behaviors,
  onAction,
  onOpenLogic,
  device = 'mobile',
  listItemFields = [],
  listItemSourceName,
  itemFrame = null,
  itemCollection = null,
  recordRoutePaths = [],
  onRecordIdentifierChange,
  onEditItemTemplate,
  designSystem,
  screen,
}: InspectorProps) {
  if (itemFrame && candidate?.id === itemFrame.id) {
    return (
      <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline px-4 py-3">
        <ItemFrameSection
          collection={itemCollection}
          itemFrame={itemFrame}
          onAction={onAction}
          onRecordIdentifierChange={onRecordIdentifierChange}
          recordRoutePaths={recordRoutePaths}
        />
        <p className="mt-2 text-xs text-ink-muted">
          The frame fills the ListView and hugs its content. Select a widget to edit its own properties.
        </p>
      </section>
    );
  }

  if (candidate === null) {
    if (screen) {
      return <DesignSystemInspector designSystem={designSystem} onAction={onAction} screen={screen} />;
    }
    return (
      <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Inspector</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Select a component on the canvas to edit its content, layout, and appearance.
        </p>
      </section>
    );
  }

  const node: ComponentNode = candidate;
  const effectiveGeometry = geometryAtBreakpoint(node, device);
  const appearance = device === 'mobile'
    ? node.appearance
    : { ...node.appearance, ...node.responsive?.[device]?.appearance };
  const effectiveTextProps = node.type === 'text'
    ? { ...node.props, ...(device === 'mobile' ? {} : node.responsive?.[device]?.textStyle) }
    : null;
  const hasBorderStyleControl = true;
  const activeBorderStyle = appearance?.borderStyle
    ?? (node.type === 'column' || node.type === 'row' ? 'dashed' : 'solid');
  function numberFromEvent(event: ChangeEvent<HTMLInputElement>): number | null {
    const raw = event.target.value;
    if (raw.trim().length === 0) {
      return null; // clearing a field is not a jump-to-zero
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function moveBy(actionX: number | null, actionY: number | null): void {
    if (actionX === null && actionY === null) {
      return;
    }
    onAction({
      type: 'node/layout-position',
      nodeId: node.id,
      x: actionX ?? effectiveGeometry.x,
      y: actionY ?? effectiveGeometry.y,
    });
  }

  function resizeBy(actionW: number | null, actionH: number | null): void {
    if (actionW === null && actionH === null) {
      return;
    }
    onAction({
      type: 'node/layout-size',
      nodeId: node.id,
      w: actionW ?? effectiveGeometry.w,
      h: actionH ?? effectiveGeometry.h,
    });
  }

  return (
    <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">{NODE_TYPE_LABELS[node.type]}</h2>

      <InspectorSection title="Style">
        <label className="grid gap-1 text-xs font-medium text-ink-muted">
          <FieldHelpLabel label="Reusable style" />
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            onChange={(event) => onAction({ type: 'node/style', nodeId: node.id, styleId: event.target.value || undefined })}
            value={node.styleId ?? ''}
          >
            <option value="">No shared style</option>
            {(designSystem?.styles ?? [])
              .filter((style) => style.componentType === node.type)
              .map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-9 rounded-tile border border-hairline px-2 text-xs font-medium text-ink"
            onClick={() => {
              const current = normalizeDesignSystem(designSystem);
              const style = {
                id: generateId('style'),
                name: `${NODE_TYPE_LABELS[node.type]} style ${current.styles.filter((item) => item.componentType === node.type).length + 1}`,
                componentType: node.type,
                ...(node.appearance ? { appearance: structuredClone(node.appearance) } : {}),
                ...(node.type === 'text' ? {
                  textStyle: {
                    fontFamily: node.props.fontFamily,
                    fontSize: node.props.fontSize,
                    fontWeight: node.props.fontWeight,
                    lineHeight: node.props.lineHeight,
                    letterSpacing: node.props.letterSpacing,
                    textAlign: node.props.textAlign,
                    fontStyle: node.props.fontStyle,
                    textTransform: node.props.textTransform,
                    lineClamp: node.props.lineClamp,
                  },
                } : {}),
              };
              onAction({ type: 'design/system', designSystem: { ...current, styles: [...current.styles, style] } });
              onAction({ type: 'node/style', nodeId: node.id, styleId: style.id });
            }}
            type="button"
          >
            Save as style
          </button>
          {node.styleId ? (
            <>
              <button
                className="min-h-9 rounded-tile border border-hairline px-2 text-xs font-medium text-ink"
                onClick={() => {
                  const current = normalizeDesignSystem(designSystem);
                  onAction({
                    type: 'design/system',
                    designSystem: {
                      ...current,
                      styles: current.styles.map((style) => style.id === node.styleId
                        ? {
                            ...style,
                            appearance: node.appearance ? structuredClone(node.appearance) : undefined,
                            ...(node.type === 'text' ? { textStyle: {
                              fontFamily: node.props.fontFamily,
                              fontSize: node.props.fontSize,
                              fontWeight: node.props.fontWeight,
                              lineHeight: node.props.lineHeight,
                              letterSpacing: node.props.letterSpacing,
                              textAlign: node.props.textAlign,
                              fontStyle: node.props.fontStyle,
                              textTransform: node.props.textTransform,
                              lineClamp: node.props.lineClamp,
                            } } : {}),
                          }
                        : style),
                    },
                  });
                }}
                type="button"
              >
                Update style
              </button>
              <button className="min-h-9 px-2 text-xs font-medium text-ink-muted" onClick={() => onAction({ type: 'node/style', nodeId: node.id, styleId: undefined })} type="button">
                Detach
              </button>
            </>
          ) : null}
        </div>
      </InspectorSection>

      {node.type === 'button' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Button label"
            name="inspector-button-label"
            onChange={(event) => onAction({ type: 'node/props-button', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-button-icon"><FieldHelpLabel label="Button icon" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-button-icon"
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                onAction({ type: 'node/props-button', nodeId: node.id, props: { icon: undefined, iconPosition: undefined } });
                return;
              }
              if (isButtonIconName(value)) {
                onAction({ type: 'node/props-button', nodeId: node.id, props: { icon: value } });
              }
            }}
            value={node.props.icon ?? ''}
          >
            <option value="">No icon</option>
            {BUTTON_ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {node.props.icon ? (
            <>
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-button-icon-position"><FieldHelpLabel label="Icon position" /></label>
              <select
                className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="inspector-button-icon-position"
                onChange={(event) => onAction({
                  type: 'node/props-button',
                  nodeId: node.id,
                  props: {
                    iconPosition: event.target.value === 'center'
                      ? 'center'
                      : event.target.value === 'right'
                        ? 'right'
                        : 'left',
                  },
                })}
                value={node.props.iconPosition ?? 'left'}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </>
          ) : null}
        </div>
      ) : null}

      {node.type === 'text' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Text content"
            name="inspector-text-content"
            onChange={(event) => onAction({ type: 'node/props-text', nodeId: node.id, props: { text: event.target.value } })}
            value={node.props.text}
          />
          <FontFamilyPicker
            allowAppFonts
            appFonts={normalizeDesignSystem(designSystem).typography}
            label="Font family"
            name="inspector-text-font-family"
            onChange={(fontFamily) => {
              onAction({
                type: 'node/responsive-text-style',
                nodeId: node.id,
                textStyle: { fontFamily: fontFamily || undefined },
              });
            }}
            value={effectiveTextProps?.fontFamily ?? ''}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              label="Font size (px)"
              max={200}
              min={8}
              name="inspector-text-font-size"
              onChange={(event) => {
                const raw = event.target.value;
                if (raw.trim().length === 0) {
                  onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { fontSize: undefined } });
                  return;
                }
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed > 0) {
                  onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { fontSize: parsed } });
                }
              }}
              placeholder="Level preset"
              step={1}
              type="number"
              value={effectiveTextProps?.fontSize ?? ''}
            />
            <label className="grid gap-1 text-xs font-medium text-ink-muted">
              <FieldHelpLabel label="Font weight" />
              <select
                className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) {
                    onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { fontWeight: undefined } });
                    return;
                  }
                  if (isTextFontWeight(value)) {
                    onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { fontWeight: value } });
                  }
                }}
                value={effectiveTextProps?.fontWeight ?? ''}
              >
                <option value="">Level preset</option>
                {TEXT_FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              label="Line height"
              min={0.8}
              name="inspector-text-line-height"
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed) && parsed > 0) onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { lineHeight: parsed } });
              }}
              step={0.05}
              type="number"
              value={effectiveTextProps?.lineHeight ?? 1.25}
            />
            <TextInput
              label="Letter spacing"
              name="inspector-text-letter-spacing"
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed)) onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { letterSpacing: parsed } });
              }}
              step={0.1}
              type="number"
              value={effectiveTextProps?.letterSpacing ?? 0}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-ink-muted">
              <FieldHelpLabel label="Alignment" />
              <select className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { textAlign: event.target.value as TextProps['textAlign'] } })} value={effectiveTextProps?.textAlign ?? 'left'}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-ink-muted">
              <FieldHelpLabel label="Transform" />
              <select className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { textTransform: event.target.value as TextProps['textTransform'] } })} value={effectiveTextProps?.textTransform ?? 'none'}>
                <option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option>
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
            <input checked={effectiveTextProps?.fontStyle === 'italic'} onChange={(event) => onAction({ type: 'node/responsive-text-style', nodeId: node.id, textStyle: { fontStyle: event.target.checked ? 'italic' : 'normal' } })} type="checkbox" />
            <FieldHelpLabel label="Italic" />
          </label>
          <p className="text-xs text-ink-muted">Blank values use the app font and selected text level preset.</p>
        </div>
      ) : null}

      {node.type === 'icon' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Icon</p>
          <label className="grid gap-1 text-xs font-medium text-ink-muted">
            <FieldHelpLabel label="Symbol" />
            <select
              className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
              onChange={(event) => {
                if (isAppIconName(event.target.value)) onAction({ type: 'node/props-icon', nodeId: node.id, props: { icon: event.target.value } });
              }}
              value={node.props.icon}
            >
              {APP_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <TextInput
            label="Accessible label"
            name="inspector-icon-label"
            onChange={(event) => onAction({ type: 'node/props-icon', nodeId: node.id, props: { label: event.target.value } })}
            placeholder="Blank when decorative"
            value={node.props.label}
          />
          <TextInput
            label="Stroke width"
            min={0.5}
            name="inspector-icon-stroke"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-icon', nodeId: node.id, props: { strokeWidth: Math.max(0.5, Math.min(4, parsed)) } });
            }}
            step={0.25}
            type="number"
            value={node.props.strokeWidth}
          />
        </div>
      ) : null}

      {node.type === 'input' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            disabled={node.props.showLabel === false}
            label="Field label"
            name="inspector-input-label"
            onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.showLabel !== false}
              onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { showLabel: event.target.checked } })}
              type="checkbox"
            />
            <FieldHelpLabel label="Show field label" />
          </label>
          <TextInput
            label="Placeholder text"
            name="inspector-input-placeholder"
            onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { placeholder: event.target.value } })}
            value={node.props.placeholder}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-input-type"><FieldHelpLabel label="Input type" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-input-type"
            onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { inputType: event.target.value as InputProps['inputType'] } })}
            value={node.props.inputType}
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="password">Password</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
          </select>
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.multiline}
              onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { multiline: event.target.checked } })}
              type="checkbox"
            />
            <FieldHelpLabel label="Multiline" />
          </label>
          <FieldStyleControl
            value={node.props.fieldStyle}
            onChange={(fieldStyle) => onAction({ type: 'node/props-input', nodeId: node.id, props: { fieldStyle } })}
          />
        </div>
      ) : null}

      {node.type === 'image' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Image URL"
            name="inspector-image-src"
            onChange={(event) => onAction({ type: 'node/props-image', nodeId: node.id, props: { src: event.target.value } })}
            value={node.props.src}
          />
          <TextInput
            label="Alt text"
            name="inspector-image-alt"
            onChange={(event) => onAction({ type: 'node/props-image', nodeId: node.id, props: { alt: event.target.value } })}
            value={node.props.alt}
          />
        </div>
      ) : null}

      {node.type === 'gesture-detector' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Interaction</p>
          <TextInput
            label="Accessible action label"
            name="inspector-gesture-label"
            onChange={(event) => onAction({
              type: 'node/props-gesture-detector',
              nodeId: node.id,
              props: { semanticLabel: event.target.value },
            })}
            value={node.props.semanticLabel}
          />
          <p className="text-xs text-ink-muted">Wrap visual content, then connect its tap in Logic mode.</p>
        </div>
      ) : null}

      {node.type === 'camera' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Camera</p>
          <TextInput
            label="Camera label"
            name="inspector-camera-label"
            onChange={(event) => onAction({ type: 'node/props-camera', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <TextInput
            label="Manual fallback label"
            name="inspector-camera-capture-label"
            onChange={(event) => onAction({ type: 'node/props-camera', nodeId: node.id, props: { captureLabel: event.target.value } })}
            value={node.props.captureLabel}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-camera-capture-mode"><FieldHelpLabel label="Capture mode" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-camera-capture-mode"
            onChange={(event) => onAction({
              type: 'node/props-camera',
              nodeId: node.id,
              props: { captureMode: event.target.value as CameraProps['captureMode'] },
            })}
            value={node.props.captureMode ?? 'manual'}
          >
            <option value="manual">Manual photo</option>
            <option value="guided-face">Guided face (automatic)</option>
          </select>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-camera-facing-mode"><FieldHelpLabel label="Facing camera" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-camera-facing-mode"
            onChange={(event) => onAction({
              type: 'node/props-camera',
              nodeId: node.id,
              props: { facingMode: event.target.value as CameraProps['facingMode'] },
            })}
            value={node.props.facingMode}
          >
            <option value="user">Front camera</option>
            <option value="environment">Rear camera</option>
          </select>
          <p className="text-xs text-ink-muted">Guided face capture checks position, angle, lighting, and clarity locally before taking the photo. The camera still activates only after an explicit action.</p>
        </div>
      ) : null}

      {node.type === 'file-input' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">File input</p>
          <TextInput label="Label" name="inspector-file-label" onChange={(event) => onAction({ type: 'node/props-file-input', nodeId: node.id, props: { label: event.target.value } })} value={node.props.label} />
          <TextInput label="Helper text" name="inspector-file-helper" onChange={(event) => onAction({ type: 'node/props-file-input', nodeId: node.id, props: { helperText: event.target.value } })} value={node.props.helperText} />
          <p className="text-xs text-ink-muted">Text, Markdown, HTML, and PDF are extracted by the runtime; original bytes are discarded.</p>
        </div>
      ) : null}

      {node.type === 'chat' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Chat</p>
          <TextInput label="Title" name="inspector-chat-title" onChange={(event) => onAction({ type: 'node/props-chat', nodeId: node.id, props: { title: event.target.value } })} value={node.props.title} />
          <TextInput label="Composer placeholder" name="inspector-chat-placeholder" onChange={(event) => onAction({ type: 'node/props-chat', nodeId: node.id, props: { placeholder: event.target.value } })} value={node.props.placeholder} />
          <TextInput label="Send button label" name="inspector-chat-send" onChange={(event) => onAction({ type: 'node/props-chat', nodeId: node.id, props: { sendLabel: event.target.value } })} value={node.props.sendLabel} />
          <TextInput label="Empty text" name="inspector-chat-empty" onChange={(event) => onAction({ type: 'node/props-chat', nodeId: node.id, props: { emptyText: event.target.value } })} value={node.props.emptyText} />
          <FieldStyleControl
            value={node.props.fieldStyle}
            onChange={(fieldStyle) => onAction({ type: 'node/props-chat', nodeId: node.id, props: { fieldStyle } })}
          />
        </div>
      ) : null}

      {node.type === 'chart' ? (
        <ChartInspector
          onChange={(props) => onAction({ type: 'node/props-chart', nodeId: node.id, props })}
          props={node.props}
        />
      ) : null}

      {node.type === 'column' || node.type === 'row' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Axis layout</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-main-axis"><FieldHelpLabel label="Main axis alignment" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-main-axis"
            onChange={(event) => onAction({
              type: node.type === 'column' ? 'node/props-column' : 'node/props-row',
              nodeId: node.id,
              props: { mainAxisAlignment: event.target.value as MainAxisAlignment },
            })}
            value={node.props.mainAxisAlignment}
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="space-between">Space between</option>
            <option value="space-around">Space around</option>
            <option value="space-evenly">Space evenly</option>
          </select>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-cross-axis"><FieldHelpLabel label="Cross axis alignment" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-cross-axis"
            onChange={(event) => onAction({
              type: node.type === 'column' ? 'node/props-column' : 'node/props-row',
              nodeId: node.id,
              props: { crossAxisAlignment: event.target.value as CrossAxisAlignment },
            })}
            value={node.props.crossAxisAlignment}
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="stretch">Stretch</option>
          </select>
          <TextInput
            label="Gap"
            name="inspector-layout-gap"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({
                type: node.type === 'column' ? 'node/props-column' : 'node/props-row',
                nodeId: node.id,
                props: { gap: Math.max(0, parsed) },
              });
            }}
            type="number"
            value={node.props.gap}
          />
          <PaddingField
            label="Padding"
            namePrefix="inspector-layout-padding"
            onChange={(padding) => onAction({
              type: node.type === 'column' ? 'node/props-column' : 'node/props-row',
              nodeId: node.id,
              props: { padding },
            })}
            value={node.props.padding}
          />
          <p className="text-xs text-ink-muted">
            {node.type === 'column' ? 'Children flow vertically.' : 'Children flow horizontally.'}
          </p>
        </div>
      ) : null}

      {node.type === 'listview' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">ListView</p>
          <button
            className="min-h-11 rounded-tile bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            id={`edit-item-template-${node.id}`}
            onClick={() => onEditItemTemplate?.(node.id)}
            type="button"
          >
            Edit item design
          </button>
          <p className="text-xs text-ink-muted">{node.children.length} root widget{node.children.length === 1 ? '' : 's'} in the shared item template.</p>
          <p className="text-xs text-ink-muted">
            Collection data is configured with the Logic Builder’s Load List Items node.
          </p>
          {node.props.dataSource.kind === 'static' ? (
            <>
              <StaticListItemsEditor node={node} onAction={onAction} />
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-items"><FieldHelpLabel label="Static items" /></label>
              <textarea
                className="h-24 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-brand-600"
                id="inspector-listview-items"
                onChange={(event) => {
                  const source = node.props.dataSource;
                  if (source.kind !== 'static') return;
                  const field = source.fields[0] ?? { id: 'value', label: 'Value', type: 'text' as const };
                  const values = event.target.value.split('\n').filter((item) => item.length > 0);
                  onAction({
                    type: 'node/props-listview',
                    nodeId: node.id,
                    props: {
                      dataSource: {
                        kind: 'static',
                        fields: source.fields.length > 0 ? source.fields : [field],
                        items: values.map((value, index) => ({
                          id: source.items[index]?.id ?? `${node.id}__static_${index + 1}`,
                          values: { ...(source.items[index]?.values ?? {}), [field.id]: value },
                        })),
                      },
                    },
                  });
                }}
                value={node.props.dataSource.items.map((item) => String(item.values[node.props.dataSource.kind === 'static' ? (node.props.dataSource.fields[0]?.id ?? 'value') : 'value'] ?? '')).join('\n')}
              />
              <p className="text-xs text-ink-muted">One item per line.</p>
            </>
          ) : null}
          <TextInput
            label="Empty state text"
            name="inspector-listview-empty"
            onChange={(event) => onAction({ type: 'node/props-listview', nodeId: node.id, props: { emptyText: event.target.value } })}
            value={node.props.emptyText}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-direction"><FieldHelpLabel label="Scroll direction" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-listview-direction"
            onChange={(event) => onAction({
              type: 'node/props-listview',
              nodeId: node.id,
              props: { scrollDirection: event.target.value as 'vertical' | 'horizontal' },
            })}
            value={node.props.scrollDirection}
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
          <p className="text-xs text-ink-muted">Nested widgets use free-form positions inside the item frame repeated for every record.</p>
        </div>
      ) : null}

      {listItemFields.length > 0 ? (
        <PropertyBindingControls
          fields={listItemFields}
          node={node}
          sourceName={listItemSourceName}
          onChange={(target, fieldId) => {
            const bindings = (node.bindings ?? []).filter((binding) => binding.target !== target);
            if (fieldId) bindings.push({ target, value: { source: 'list-item', fieldId } });
            onAction({ type: 'node/bindings', nodeId: node.id, bindings });
          }}
        />
      ) : null}

      {node.type === 'checkbox' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Label"
            name="inspector-checkbox-label"
            onChange={(event) => onAction({ type: 'node/props-checkbox', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.checked}
              onChange={(event) => onAction({ type: 'node/props-checkbox', nodeId: node.id, props: { checked: event.target.checked } })}
              type="checkbox"
            />
            <FieldHelpLabel label="Checked by default" />
          </label>
          <FieldStyleControl
            value={node.props.fieldStyle}
            onChange={(fieldStyle) => onAction({ type: 'node/props-checkbox', nodeId: node.id, props: { fieldStyle } })}
          />
        </div>
      ) : null}

      {node.type === 'radio' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Label"
            name="inspector-radio-label"
            onChange={(event) => onAction({ type: 'node/props-radio', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-radio-options"><FieldHelpLabel label="Options" /></label>
          <textarea
            className="h-24 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-brand-600"
            id="inspector-radio-options"
            onChange={(event) => onAction({ type: 'node/props-radio', nodeId: node.id, props: { options: event.target.value.split('\\n').filter((item) => item.trim().length > 0) } })}
            value={node.props.options.join('\\n')}
          />
          <TextInput
            label="Selected index"
            name="inspector-radio-selected"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-radio', nodeId: node.id, props: { selectedIndex: parsed } });
            }}
            type="number"
            value={node.props.selectedIndex}
          />
        </div>
      ) : null}

      {node.type === 'switch' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Label"
            name="inspector-switch-label"
            onChange={(event) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          {!node.props.controlsTheme ? <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.checked}
              onChange={(event) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { checked: event.target.checked } })}
              type="checkbox"
            />
            <FieldHelpLabel label="On by default" />
          </label> : null}
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.controlsTheme === true}
              onChange={(event) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { controlsTheme: event.target.checked } })}
              type="checkbox"
            />
            <FieldHelpLabel label="Use as dark mode switch" />
          </label>
          {node.props.controlsTheme ? <p className="text-xs text-ink-muted">Off uses Light and on uses Dark. This affects the app, not the Novy editor.</p> : null}
          <FieldStyleControl
            value={node.props.fieldStyle}
            onChange={(fieldStyle) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { fieldStyle } })}
          />
        </div>
      ) : null}

      {node.type === 'dropdown' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-dropdown-presentation"><FieldHelpLabel label="Presentation" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-dropdown-presentation"
            onChange={(event) => onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { presentation: event.target.value === 'menu' ? 'menu' : 'select' } })}
            value={node.props.presentation ?? 'select'}
          >
            <option value="select">Dropdown</option>
            <option value="menu">Actions menu</option>
          </select>
          <TextInput
            label="Label"
            name="inspector-dropdown-label"
            onChange={(event) => onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <TextInput
            label="Placeholder"
            name="inspector-dropdown-placeholder"
            onChange={(event) => onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { placeholder: event.target.value } })}
            value={node.props.placeholder}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-dropdown-options"><FieldHelpLabel label="Options" /></label>
          <textarea
            className="h-24 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-brand-600"
            id="inspector-dropdown-options"
            onChange={(event) => onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { options: event.target.value.split('\n') } })}
            value={node.props.options.join('\n')}
          />
          {node.props.presentation === 'menu' ? <p className="text-xs text-ink-muted">Each option emits a change event. Use If / Else to choose its workflow.</p> : null}
          <TextInput
            label="Selected index (-1 for none)"
            name="inspector-dropdown-selected"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { selectedIndex: parsed } });
            }}
            type="number"
            value={node.props.selectedIndex}
          />
          <FieldStyleControl
            value={node.props.fieldStyle}
            onChange={(fieldStyle) => onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { fieldStyle } })}
          />
        </div>
      ) : null}

      {node.type === 'slider' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Label"
            name="inspector-slider-label"
            onChange={(event) => onAction({ type: 'node/props-slider', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <TextInput
            label="Minimum"
            name="inspector-slider-min"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-slider', nodeId: node.id, props: { min: parsed } });
            }}
            type="number"
            value={node.props.min}
          />
          <TextInput
            label="Maximum"
            name="inspector-slider-max"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-slider', nodeId: node.id, props: { max: parsed } });
            }}
            type="number"
            value={node.props.max}
          />
          <TextInput
            label="Step"
            name="inspector-slider-step"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-slider', nodeId: node.id, props: { step: parsed } });
            }}
            type="number"
            value={node.props.step}
          />
          <TextInput
            label="Value"
            name="inspector-slider-value"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-slider', nodeId: node.id, props: { value: parsed } });
            }}
            type="number"
            value={node.props.value}
          />
        </div>
      ) : null}

      {node.type === 'progress' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <TextInput
            label="Label"
            name="inspector-progress-label"
            onChange={(event) => onAction({ type: 'node/props-progress', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <TextInput
            label="Value"
            name="inspector-progress-value"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-progress', nodeId: node.id, props: { value: parsed } });
            }}
            type="number"
            value={node.props.value}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.indeterminate}
              onChange={(event) => onAction({ type: 'node/props-progress', nodeId: node.id, props: { indeterminate: event.target.checked } })}
              type="checkbox"
            />
            <FieldHelpLabel label="Indeterminate" />
          </label>
        </div>
      ) : null}

      {node.type === 'divider' ? (
        <div className="mt-4 grid gap-3">
          <p className="inspector-section-label">Content</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-divider-orientation"><FieldHelpLabel label="Orientation" /></label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-divider-orientation"
            onChange={(event) => onAction({ type: 'node/props-divider', nodeId: node.id, props: { orientation: event.target.value as DividerProps['orientation'] } })}
            value={node.props.orientation}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
          <TextInput
            label="Thickness"
            name="inspector-divider-thickness"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onAction({ type: 'node/props-divider', nodeId: node.id, props: { thickness: parsed } });
            }}
            type="number"
            value={node.props.thickness}
          />
        </div>
      ) : null}

      {node.type === 'container' ? (
        <div className="mt-4">
          <p className="inspector-section-label">Content</p>
          <p className="text-sm text-ink-muted">Containers keep free-form child positioning.</p>
        </div>
      ) : null}

      <InspectorSection title="Position">
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label="X"
            name="inspector-geometry-x"
            onChange={(event) => moveBy(numberFromEvent(event), null)}
            type="number"
            value={effectiveGeometry.x}
          />
          <TextInput
            label="Y"
            name="inspector-geometry-y"
            onChange={(event) => moveBy(null, numberFromEvent(event))}
            type="number"
            value={effectiveGeometry.y}
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Layout">
        <p className="text-xs text-ink-muted">
          {device === 'mobile' ? 'Base mobile geometry' : `${device} override (inherits mobile until edited)`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label="Width"
            name="inspector-geometry-w"
            onChange={(event) => resizeBy(numberFromEvent(event), null)}
            type="number"
            value={effectiveGeometry.w}
          />
          <TextInput
            label="Height"
            name="inspector-geometry-h"
            onChange={(event) => resizeBy(null, numberFromEvent(event))}
            type="number"
            value={effectiveGeometry.h}
          />
        </div>
        {device !== 'mobile' && node.responsive?.[device] ? (
          <button className="mt-2 text-xs font-medium text-brand-700" onClick={() => onAction({ type: 'node/responsive-reset', nodeId: node.id })} type="button">
            Reset responsive overrides
          </button>
        ) : null}
      </InspectorSection>

      <InspectorSection title="Appearance">
        <label className="mb-3 grid gap-1 text-xs font-medium text-ink-muted">
          <FieldHelpLabel label="Quick background token" />
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            onChange={(event) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, backgroundColor: event.target.value || undefined, gradient: undefined } })}
            value=""
          >
            <option value="">Choose a semantic token…</option>
            {(['primary', 'accent', 'canvas', 'surface', 'surfaceElevated'] as const).map((token) => <option key={token} value={colorTokenCssValue(token)}>{token}</option>)}
          </select>
        </label>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <ColorField
            label="Background"
            name="inspector-appearance-background"
            onChange={(value) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, backgroundColor: value || undefined } })}
            placeholder="#ffffff"
            value={appearance?.backgroundColor ?? ''}
          />
          <ColorField
            label="Text color"
            name="inspector-appearance-text"
            onChange={(value) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, textColor: value || undefined } })}
            placeholder="#111827"
            value={appearance?.textColor ?? ''}
          />
          <ColorField
            label="Border color"
            name="inspector-appearance-border"
            onChange={(value) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, borderColor: value || undefined } })}
            placeholder="#d1d5db"
            value={appearance?.borderColor ?? ''}
          />
          <TextInput
            label="Corner radius"
            name="inspector-appearance-radius"
            onChange={(event) => {
              const value = numberFromEvent(event);
              if (value !== null) onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, borderRadius: Math.max(0, value) } });
            }}
            type="number"
            value={appearance?.borderRadius ?? (node.type === 'input' ? 6 : 0)}
          />
          <TextInput
            label="Border width"
            min={0}
            name="inspector-appearance-border-width"
            onChange={(event) => {
              const value = numberFromEvent(event);
              if (value !== null) onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, borderWidth: Math.max(0, value) } });
            }}
            step={1}
            type="number"
            value={appearance?.borderWidth ?? 1}
          />
          <details className="col-span-2">
            <summary className="cursor-pointer text-xs font-medium text-ink-muted">Advanced borders</summary>
            <p className="mt-1 text-[11px] text-ink-muted">Override individual edges. Set the other edges to 0 for an underline.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <TextInput
                  key={side}
                  label={`${side[0].toUpperCase()}${side.slice(1)} width`}
                  min={0}
                  name={`inspector-appearance-border-${side}`}
                  onChange={(event) => {
                    const value = numberFromEvent(event);
                    if (value === null) return;
                    const sides: BorderSides = { ...appearance?.borderSides };
                    sides[side] = { ...sides[side], width: Math.max(0, value) };
                    onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, borderSides: sides } });
                  }}
                  step={1}
                  type="number"
                  value={appearance?.borderSides?.[side]?.width ?? ''}
                />
              ))}
            </div>
          </details>
          <TextInput
            label="Opacity"
            max={1}
            min={0}
            name="inspector-appearance-opacity"
            onChange={(event) => {
              const value = numberFromEvent(event);
              if (value !== null) onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, opacity: Math.max(0, Math.min(1, value)) } });
            }}
            step={0.05}
            type="number"
            value={appearance?.opacity ?? 1}
          />
          <TextInput
            label="Backdrop blur"
            max={40}
            min={0}
            name="inspector-appearance-blur"
            onChange={(event) => {
              const value = numberFromEvent(event);
              if (value !== null) onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, backdropBlur: Math.max(0, Math.min(40, value)) } });
            }}
            type="number"
            value={appearance?.backdropBlur ?? 0}
          />
        </div>
        {hasBorderStyleControl ? (
          <div className="mb-3">
            <p className="mb-2 text-xs font-medium text-ink-muted">Border style</p>
            <SegmentedControl
              ariaLabel="Border style"
              onChange={(borderStyle) => onAction({
                type: 'node/appearance',
                nodeId: node.id,
                appearance: { ...appearance, borderStyle },
              })}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'none', label: 'None' },
              ]}
              value={activeBorderStyle}
            />
          </div>
        ) : null}
        <div className="mb-3 grid gap-2">
          <label className="grid gap-1 text-xs font-medium text-ink-muted">
            <FieldHelpLabel label="Effect preset" />
            <select
              className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
              onChange={(event) => {
                const value = event.target.value;
                const boxShadows = value === 'soft'
                  ? [{ x: 0, y: 8, blur: 24, spread: -8, color: 'rgba(15, 23, 42, 0.18)' }]
                  : value === 'elevated'
                    ? [{ x: 0, y: 16, blur: 40, spread: -12, color: 'rgba(15, 23, 42, 0.28)' }]
                    : value === 'glow'
                      ? [{ x: 0, y: 0, blur: 24, spread: 2, color: 'var(--novy-app-accent)' }]
                      : undefined;
                onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, boxShadows } });
              }}
              value={appearance?.boxShadows?.length ? 'custom' : 'none'}
            >
              <option value="none">None</option><option value="soft">Soft shadow</option><option value="elevated">Elevated</option><option value="glow">Accent glow</option>{appearance?.boxShadows?.length ? <option value="custom">Current effect</option> : null}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
            <input checked={appearance?.clipContent !== false} onChange={(event) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, clipContent: event.target.checked } })} type="checkbox" />
            <FieldHelpLabel label="Clip content to bounds" />
          </label>
        </div>
        <details className="mb-3 rounded-tile border border-hairline p-2">
          <summary className="cursor-pointer text-xs font-medium text-ink">Gradient fill</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ColorField label="Start" name="inspector-gradient-start" onChange={(color) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, gradient: color ? { angle: appearance?.gradient?.angle ?? 135, stops: [{ color, position: 0 }, { color: appearance?.gradient?.stops[1]?.color ?? '#ffffff', position: 100 }] } : undefined } })} value={appearance?.gradient?.stops[0]?.color ?? ''} />
            <ColorField label="End" name="inspector-gradient-end" onChange={(color) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, gradient: color ? { angle: appearance?.gradient?.angle ?? 135, stops: [{ color: appearance?.gradient?.stops[0]?.color ?? '#5551f2', position: 0 }, { color, position: 100 }] } : undefined } })} value={appearance?.gradient?.stops[1]?.color ?? ''} />
            <TextInput label="Angle" name="inspector-gradient-angle" onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && appearance?.gradient) onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, gradient: { ...appearance.gradient, angle: value } } }); }} type="number" value={appearance?.gradient?.angle ?? 135} />
          </div>
        </details>
        <details className="mb-3 rounded-tile border border-hairline p-2">
          <summary className="cursor-pointer text-xs font-medium text-ink">Dark theme colors</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([
              ['backgroundColor', 'Dark background'],
              ['textColor', 'Dark text color'],
              ['borderColor', 'Dark border color'],
            ] as const).map(([key, label]) => (
              <ColorField
                key={key}
                label={label}
                name={`inspector-dark-${key}`}
                onChange={(value) => {
                  const dark = { ...appearance?.dark };
                  if (value) dark[key] = value;
                  else delete dark[key];
                  const hasColors = Object.keys(dark).length > 0;
                  onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...appearance, dark: hasColors ? dark : undefined } });
                }}
                placeholder="Inherit"
                value={appearance?.dark?.[key] ?? ''}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Blank colors inherit the normal appearance.</p>
        </details>
        {node.type === 'button' ? (
          <SegmentedControl
            ariaLabel="Button variant"
            onChange={(variant) => onAction({ type: 'node/props-button', nodeId: node.id, props: { variant } })}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'outline', label: 'Outline' },
              { value: 'text', label: 'Text' },
            ]}
            value={node.props.variant}
          />
        ) : null}
        {node.type === 'text' ? (
          <SegmentedControl
            ariaLabel="Text level"
            onChange={(level) => onAction({ type: 'node/props-text', nodeId: node.id, props: { level } })}
            options={[
              { value: 'display', label: 'Display' },
              { value: 'title', label: 'Title' },
              { value: 'body', label: 'Body' },
            ]}
            value={node.props.level}
          />
        ) : null}
        {node.type === 'image' ? (
          <SegmentedControl
            ariaLabel="Image fit"
            onChange={(fit) => onAction({ type: 'node/props-image', nodeId: node.id, props: { fit } })}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
            ]}
            value={node.props.fit}
          />
        ) : null}
      </InspectorSection>

      <InspectorSection title="Behavior">
        {behaviors.some((behavior) => behavior.targetNodeId === node.id) ? (
          <ul className="mb-2 grid gap-1" data-testid="bound-behaviors">
            {behaviors
              .filter((behavior) => behavior.targetNodeId === node.id)
              .map((behavior) => (
                <li className="rounded-tile bg-canvas px-2 py-1.5 text-xs text-ink" key={behavior.id}>
                  {TRIGGER_EVENT_LABELS[behavior.event]}
                </li>
              ))}
          </ul>
        ) : null}
        <p className="text-xs text-ink-muted">
          Connect this component to actions like taps and screen changes in Logic mode.
        </p>
        <button
          className="mt-2 rounded-tile border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
          onClick={onOpenLogic}
          type="button"
        >
          Open Logic mode
        </button>
      </InspectorSection>
    </section>
  );
}

function StaticListItemsEditor({
  node,
  onAction,
}: {
  node: ListViewNode;
  onAction: (action: EditorAction) => void;
}) {
  const [draft, setDraft] = useState<{ fields: ListViewItemField[]; items: StaticListViewItem[] } | null>(null);
  if (node.props.dataSource.kind !== 'static') return null;

  function open(): void {
    if (node.props.dataSource.kind !== 'static') return;
    setDraft(structuredClone({ fields: node.props.dataSource.fields, items: node.props.dataSource.items }));
  }

  function updateField(index: number, patch: Partial<ListViewItemField>): void {
    setDraft((current) => current ? {
      ...current,
      fields: current.fields.map((field, candidate) => candidate === index ? { ...field, ...patch } : field),
    } : current);
  }

  function removeField(fieldId: string): void {
    if (!window.confirm('Remove this field and its item values?')) return;
    setDraft((current) => current ? {
      fields: current.fields.filter((field) => field.id !== fieldId),
      items: current.items.map((item) => {
        const values = { ...item.values };
        delete values[fieldId];
        return { ...item, values };
      }),
    } : current);
  }

  return (
    <>
      <button className="min-h-11 rounded-tile border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink" onClick={open} type="button">
        Edit structured items
      </button>
      {draft ? (
        <Modal labelledBy="static-list-items-title" onClose={() => setDraft(null)} panelClassName="max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink" id="static-list-items-title">Static ListView items</h2>
              <p className="mt-1 text-sm text-ink-muted">Define typed fields and representative item records.</p>
            </div>
            <button aria-label="Close static items editor" className="min-h-11 min-w-11 rounded-tile text-ink-muted" onClick={() => setDraft(null)} type="button">×</button>
          </div>

          <section className="mt-5 grid gap-3" aria-labelledby="static-fields-title">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink" id="static-fields-title">Fields</h3>
              <button className="min-h-11 rounded-tile border border-hairline px-3 text-sm font-medium text-ink" onClick={() => setDraft((current) => current ? {
                ...current,
                fields: [...current.fields, { id: uniqueFieldId(current.fields), label: 'New field', type: 'text' }],
              } : current)} type="button">Add field</button>
            </div>
            {draft.fields.map((field, index) => (
              <div className="grid grid-cols-[1fr_10rem_auto] items-end gap-2" key={field.id}>
                <TextInput label={`Field ${index + 1} label`} name={`static-field-${field.id}`} onChange={(event) => updateField(index, { label: event.target.value })} value={field.label} />
                <label className="grid gap-1 text-xs font-medium text-ink-muted"><FieldHelpLabel label="Type" />
                  <select className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => updateField(index, { type: event.target.value as DataFieldType })} value={field.type}>
                    <option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="date">Date</option>
                  </select>
                </label>
                <button aria-label={`Remove ${field.label}`} className="min-h-11 rounded-tile border border-hairline px-3 text-sm text-red-600" onClick={() => removeField(field.id)} type="button">Remove</button>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-3" aria-labelledby="static-records-title">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink" id="static-records-title">Items</h3>
              <button className="min-h-11 rounded-tile border border-hairline px-3 text-sm font-medium text-ink" onClick={() => setDraft((current) => current ? {
                ...current,
                items: [...current.items, { id: generateId('list_item'), values: {} }],
              } : current)} type="button">Add item</button>
            </div>
            {draft.items.length === 0 ? <p className="rounded-tile border border-dashed border-hairline p-4 text-sm text-ink-muted">No static items yet.</p> : null}
            {draft.items.map((item, itemIndex) => (
              <fieldset className="grid gap-3 rounded-tile border border-hairline p-3" key={item.id}>
                <legend className="px-1 text-xs font-semibold text-ink-muted">Item {itemIndex + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {draft.fields.map((field) => (
                    <StaticValueInput field={field} key={field.id} onChange={(value) => setDraft((current) => current ? {
                      ...current,
                      items: current.items.map((candidate) => candidate.id === item.id
                        ? { ...candidate, values: { ...candidate.values, [field.id]: value } }
                        : candidate),
                    } : current)} value={item.values[field.id] ?? null} />
                  ))}
                </div>
                <button className="min-h-11 justify-self-start rounded-tile border border-hairline px-3 text-sm text-red-600" onClick={() => setDraft((current) => current ? { ...current, items: current.items.filter((candidate) => candidate.id !== item.id) } : current)} type="button">Delete item</button>
              </fieldset>
            ))}
          </section>

          <div className="mt-6 flex justify-end gap-2">
            <button className="min-h-11 rounded-tile border border-hairline px-4 text-sm font-medium text-ink" onClick={() => setDraft(null)} type="button">Cancel</button>
            <button className="min-h-11 rounded-tile bg-brand-600 px-4 text-sm font-semibold text-white" onClick={() => {
              onAction({ type: 'node/props-listview', nodeId: node.id, props: { dataSource: { kind: 'static', fields: draft.fields, items: draft.items } } });
              setDraft(null);
            }} type="button">Save items</button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function StaticValueInput({ field, value, onChange }: { field: ListViewItemField; value: DataValue; onChange: (value: DataValue) => void }) {
  if (field.type === 'boolean') {
    return <label className="flex min-h-11 items-center gap-2 text-sm text-ink"><input checked={value === true} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{field.label}</label>;
  }
  return (
    <label className="grid gap-1 text-xs font-medium text-ink-muted"><FieldHelpLabel label={field.label} />
      <input
        className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
        onChange={(event) => onChange(field.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value)}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      />
    </label>
  );
}

function uniqueFieldId(fields: readonly ListViewItemField[]): string {
  let index = fields.length + 1;
  while (fields.some((field) => field.id === `field_${index}`)) index += 1;
  return `field_${index}`;
}

function ItemFrameSection({
  itemFrame,
  onAction,
  collection,
  recordRoutePaths,
  onRecordIdentifierChange,
}: {
  itemFrame: ListViewNode;
  onAction: (action: EditorAction) => void;
  collection: DataCollection | null;
  recordRoutePaths: readonly string[];
  onRecordIdentifierChange?: (collectionId: string, key: string) => Promise<void>;
}) {
  return (
    <div className="mb-4 rounded-tile border border-hairline p-3">
      <p className="inspector-section-label">Item frame</p>
      <p className="mb-2 text-xs text-ink-muted">Applies to every repeated item.</p>
      {collection ? (
        <RecordIdentifierField
          collection={collection}
          onChange={onRecordIdentifierChange}
          routePaths={recordRoutePaths}
        />
      ) : null}
      <PaddingField
        label="Item padding"
        namePrefix="inspector-item-frame-padding"
        onChange={(padding) => onAction({ type: 'node/props-listview', nodeId: itemFrame.id, props: { padding } })}
        value={itemFrame.props.padding}
      />
      <TextInput
        label="Item spacing"
        name="inspector-item-frame-spacing"
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onAction({ type: 'node/props-listview', nodeId: itemFrame.id, props: { itemSpacing: Math.max(0, parsed) } });
        }}
        type="number"
        value={itemFrame.props.itemSpacing}
      />
      <TextInput
        label="Item border radius"
        name="inspector-item-frame-radius"
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onAction({ type: 'node/props-listview', nodeId: itemFrame.id, props: { itemBorderRadius: Math.max(0, parsed) } });
        }}
        type="number"
        value={itemFrame.props.itemBorderRadius}
      />
      <label className="mt-2 flex items-center gap-2 text-xs font-medium text-ink-muted">
        <input
          checked={itemFrame.props.showDividers}
          onChange={(event) => onAction({ type: 'node/props-listview', nodeId: itemFrame.id, props: { showDividers: event.target.checked } })}
          type="checkbox"
        />
        <FieldHelpLabel label="Show dividers" />
      </label>
    </div>
  );
}

function RecordIdentifierField({
  collection,
  routePaths,
  onChange,
}: {
  collection: DataCollection;
  routePaths: readonly string[];
  onChange?: (collectionId: string, key: string) => Promise<void>;
}) {
  const persistedKey = recordIdentifierForCollection(collection).key;
  const [key, setKey] = useState(persistedKey);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setKey(persistedKey), [persistedKey]);

  async function commit(): Promise<void> {
    const next = key.trim();
    if (next === persistedKey) return;
    if (!RECORD_IDENTIFIER_KEY_PATTERN.test(next)) {
      setError('Start with a lowercase letter and use only letters and numbers.');
      return;
    }
    if (collection.fields.some((field) => field.key === next)) {
      setError('The record ID name must be different from collection field keys.');
      return;
    }
    if (!onChange) return;
    setSaving(true);
    setError(null);
    try {
      await onChange(collection.id, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Record ID name could not be saved.');
      setKey(persistedKey);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.blur();
  }

  return (
    <div className="mb-3 grid gap-1 rounded-tile border border-hairline bg-canvas p-3">
      <label className="text-xs font-medium text-ink-muted" htmlFor={`record-identifier-${collection.id}`}>
        <FieldHelpLabel label="Item ID name" />
      </label>
      <input
        aria-describedby={`record-identifier-help-${collection.id}`}
        className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
        disabled={saving}
        id={`record-identifier-${collection.id}`}
        onBlur={() => void commit()}
        onChange={(event) => { setKey(event.target.value); setError(null); }}
        onKeyDown={handleKeyDown}
        placeholder="noteId"
        value={key}
      />
      <p className="text-xs text-ink-muted" id={`record-identifier-help-${collection.id}`}>
        Name only. The backend generates a unique value for every record.
      </p>
      {routePaths.length > 0 ? routePaths.map((path) => (
        <p className="font-mono text-xs text-brand-700" key={path}>Linked route: {path}</p>
      )) : (
        <p className="text-xs text-ink-muted">Choose Open current item in Logic to link a detail route.</p>
      )}
      {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : null}
    </div>
  );
}
