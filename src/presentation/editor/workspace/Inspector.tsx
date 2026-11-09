import { useState, type ChangeEvent } from 'react';
import type {
  CameraProps,
  ComponentNode,
  ComponentBindingTarget,
  CrossAxisAlignment,
  DividerProps,
  InputProps,
  MainAxisAlignment,
  ListViewItemField,
  ListViewNode,
  ResponsiveBreakpoint,
  StaticListViewItem,
} from '@domain/entities/componentNode';
import { geometryAtBreakpoint, isButtonIconName, isTextFontWeight } from '@domain/entities/componentNode';
import type { DataCollection, DataFieldType, DataValue } from '@domain/entities/appData';
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
import { TEXT_FONT_WEIGHT_OPTIONS } from '../renderer/nodes/textTypography';
import { TRIGGER_EVENT_LABELS } from '../logic/behaviorLabels';

interface InspectorProps {
  node: ComponentNode | null;
  /** All behaviors of the active screen, filtered for the selected node. */
  behaviors: readonly Behavior[];
  onAction: (action: EditorAction) => void;
  onOpenLogic: () => void;
  collections?: readonly DataCollection[];
  device?: ResponsiveBreakpoint;
  listItemFields?: readonly ListItemBindingField[];
  itemFrame?: ListViewNode | null;
  onEditItemTemplate?: (listViewId: string) => void;
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

const BINDING_TARGET_LABELS: Readonly<Record<ComponentBindingTarget, string>> = {
  'text.content': 'Text content',
  'image.source': 'Image source',
  'image.alt': 'Alternative text',
  'button.label': 'Button label',
  'checkbox.checked': 'Checked state',
  'switch.checked': 'Checked state',
  'progress.value': 'Progress value',
  'component.visible': 'Visibility',
};

function PropertyBindingControls({
  node,
  fields,
  onChange,
}: {
  node: ComponentNode;
  fields: readonly ListItemBindingField[];
  onChange: (target: ComponentBindingTarget, fieldId: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 border-t border-hairline pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Record data bindings</p>
      {bindingTargetsForComponent(node.type).map((definition) => {
        const compatibleFields = fields.filter((field) => isFieldTypeCompatible(definition.target, field.type));
        const selectedFieldId = node.bindings?.find((binding) => binding.target === definition.target)?.value.fieldId ?? '';
        return (
          <label className="grid gap-1 text-xs font-medium text-ink-muted" key={definition.target}>
            {BINDING_TARGET_LABELS[definition.target]}
            <select
              className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
              onChange={(event) => onChange(definition.target, event.target.value)}
              value={selectedFieldId}
            >
              <option value="">Static value</option>
              {compatibleFields.map((field) => (
                <option key={field.id} value={field.id}>{field.label}</option>
              ))}
            </select>
          </label>
        );
      })}
      <p className="text-xs text-ink-muted">Static values remain as fallbacks when item data is missing.</p>
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
  collections = [],
  device = 'mobile',
  listItemFields = [],
  itemFrame = null,
  onEditItemTemplate,
}: InspectorProps) {
  if (itemFrame && candidate?.id === itemFrame.id) {
    return (
      <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline p-4">
        <ItemFrameSection itemFrame={itemFrame} onAction={onAction} />
        <p className="mt-2 text-xs text-ink-muted">
          The frame fills the ListView and hugs its content. Select a widget to edit its own properties.
        </p>
      </section>
    );
  }

  if (candidate === null) {
    return (
      <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline p-4">
        <h2 className="text-sm font-semibold text-ink">Inspector</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Select a component on the canvas to edit its content, layout, and appearance.
        </p>
      </section>
    );
  }

  const node: ComponentNode = candidate;
  const effectiveGeometry = geometryAtBreakpoint(node, device);
  const isLayoutNode = node.type === 'container' || node.type === 'column' || node.type === 'row';
  const layoutBorderStyle = node.appearance?.borderStyle ?? (node.type === 'container' ? 'solid' : 'dashed');
  const listViewCollectionSource = node.type === 'listview' && node.props.dataSource.kind === 'collection'
    ? node.props.dataSource
    : null;
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
    <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline p-4">
      <h2 className="text-sm font-semibold text-ink">{NODE_TYPE_LABELS[node.type]}</h2>

      {node.type === 'button' ? (
        <div className="mt-4 grid gap-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Button label"
            name="inspector-button-label"
            onChange={(event) => onAction({ type: 'node/props-button', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-button-icon">Button icon</label>
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
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-button-icon-position">Icon position</label>
              <select
                className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="inspector-button-icon-position"
                onChange={(event) => onAction({
                  type: 'node/props-button',
                  nodeId: node.id,
                  props: { iconPosition: event.target.value === 'right' ? 'right' : 'left' },
                })}
                value={node.props.iconPosition ?? 'left'}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </>
          ) : null}
        </div>
      ) : null}

      {node.type === 'text' ? (
        <div className="mt-4 grid gap-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Text content"
            name="inspector-text-content"
            onChange={(event) => onAction({ type: 'node/props-text', nodeId: node.id, props: { text: event.target.value } })}
            value={node.props.text}
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
                  onAction({ type: 'node/props-text', nodeId: node.id, props: { fontSize: undefined } });
                  return;
                }
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed > 0) {
                  onAction({ type: 'node/props-text', nodeId: node.id, props: { fontSize: parsed } });
                }
              }}
              placeholder="Level preset"
              step={1}
              type="number"
              value={node.props.fontSize ?? ''}
            />
            <label className="grid gap-1 text-xs font-medium text-ink-muted">
              Font weight
              <select
                className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) {
                    onAction({ type: 'node/props-text', nodeId: node.id, props: { fontWeight: undefined } });
                    return;
                  }
                  if (isTextFontWeight(value)) {
                    onAction({ type: 'node/props-text', nodeId: node.id, props: { fontWeight: value } });
                  }
                }}
                value={node.props.fontWeight ?? ''}
              >
                <option value="">Level preset</option>
                {TEXT_FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-ink-muted">Blank values use the selected text level preset.</p>
        </div>
      ) : null}

      {node.type === 'input' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Field label"
            name="inspector-input-label"
            onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <TextInput
            label="Placeholder text"
            name="inspector-input-placeholder"
            onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { placeholder: event.target.value } })}
            value={node.props.placeholder}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-input-type">Input type</label>
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
          </select>
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.multiline}
              onChange={(event) => onAction({ type: 'node/props-input', nodeId: node.id, props: { multiline: event.target.checked } })}
              type="checkbox"
            />
            Multiline
          </label>
        </div>
      ) : null}

      {node.type === 'image' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Interaction</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Camera</p>
          <TextInput
            label="Camera label"
            name="inspector-camera-label"
            onChange={(event) => onAction({ type: 'node/props-camera', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <TextInput
            label="Capture button label"
            name="inspector-camera-capture-label"
            onChange={(event) => onAction({ type: 'node/props-camera', nodeId: node.id, props: { captureLabel: event.target.value } })}
            value={node.props.captureLabel}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-camera-facing-mode">Facing camera</label>
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
          <p className="text-xs text-ink-muted">The camera activates only after an explicit action in Preview or the generated app.</p>
        </div>
      ) : null}

      {node.type === 'column' || node.type === 'row' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Axis layout</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-main-axis">Main axis alignment</label>
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
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-cross-axis">Cross axis alignment</label>
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">ListView</p>
          <button
            className="min-h-11 rounded-tile bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            id={`edit-item-template-${node.id}`}
            onClick={() => onEditItemTemplate?.(node.id)}
            type="button"
          >
            Edit item design
          </button>
          <p className="text-xs text-ink-muted">{node.children.length} root widget{node.children.length === 1 ? '' : 's'} in the shared item template.</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-source">Data source</label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-listview-source"
            onChange={(event) => {
              if (event.target.value === 'static') {
                onAction({
                  type: 'node/props-listview',
                  nodeId: node.id,
                  props: {
                    dataSource: {
                      kind: 'static',
                      fields: [{ id: 'value', label: 'Value', type: 'text' }],
                      items: [],
                    },
                  },
                });
                return;
              }
              const collection = collections[0];
              onAction({
                type: 'node/props-listview',
                nodeId: node.id,
                props: {
                  dataSource: {
                    kind: 'collection',
                    collectionId: collection?.id ?? '',
                    displayFieldIds: collection?.fields[0] ? [collection.fields[0].id] : [],
                  },
                },
              });
            }}
            value={node.props.dataSource.kind}
          >
            <option value="static">Static items</option>
            <option value="collection">Collection</option>
          </select>
          {listViewCollectionSource ? (
            <>
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-collection">Collection</label>
              <select
                className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="inspector-listview-collection"
                onChange={(event) => {
                  const collection = collections.find((item) => item.id === event.target.value);
                  onAction({
                    type: 'node/props-listview',
                    nodeId: node.id,
                    props: {
                      dataSource: {
                        kind: 'collection',
                        collectionId: event.target.value,
                        displayFieldIds: collection?.fields[0] ? [collection.fields[0].id] : [],
                      },
                    },
                  });
                }}
                value={listViewCollectionSource.collectionId}
              >
                <option value="">Choose a collection…</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-field">Primary display field</label>
              <select
                className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="inspector-listview-field"
                onChange={(event) => onAction({
                  type: 'node/props-listview',
                  nodeId: node.id,
                  props: { dataSource: { ...listViewCollectionSource, displayFieldIds: event.target.value ? [event.target.value] : [] } },
                })}
                value={listViewCollectionSource.displayFieldIds[0] ?? ''}
              >
                <option value="">Choose a field…</option>
                {collections.find((collection) => collection.id === listViewCollectionSource.collectionId)?.fields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
              </select>
            </>
          ) : null}
          {node.props.dataSource.kind === 'static' ? (
            <>
              <StaticListItemsEditor node={node} onAction={onAction} />
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-items">Static items</label>
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
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-listview-direction">Scroll direction</label>
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
          onChange={(target, fieldId) => {
            const bindings = (node.bindings ?? []).filter((binding) => binding.target !== target);
            if (fieldId) bindings.push({ target, value: { source: 'list-item', fieldId } });
            onAction({ type: 'node/bindings', nodeId: node.id, bindings });
          }}
        />
      ) : null}

      {node.type === 'checkbox' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
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
            Checked by default
          </label>
        </div>
      ) : null}

      {node.type === 'radio' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Label"
            name="inspector-radio-label"
            onChange={(event) => onAction({ type: 'node/props-radio', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-radio-options">Options</label>
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Label"
            name="inspector-switch-label"
            onChange={(event) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.checked}
              onChange={(event) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { checked: event.target.checked } })}
              type="checkbox"
            />
            On by default
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.controlsTheme === true}
              onChange={(event) => onAction({ type: 'node/props-switch', nodeId: node.id, props: { controlsTheme: event.target.checked } })}
              type="checkbox"
            />
            Control app light/dark theme
          </label>
          {node.props.controlsTheme ? <p className="text-xs text-ink-muted">This affects the previewed app, not the Novy editor.</p> : null}
        </div>
      ) : null}

      {node.type === 'dropdown' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-dropdown-presentation">Presentation</label>
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
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-dropdown-options">Options</label>
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
        </div>
      ) : null}

      {node.type === 'slider' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
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
            Indeterminate
          </label>
        </div>
      ) : null}

      {node.type === 'divider' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-divider-orientation">Orientation</label>
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <p className="text-sm text-ink-muted">Containers keep free-form child positioning.</p>
        </div>
      ) : null}

      <div aria-label="Layout" className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Layout</p>
        <p className="mb-2 text-xs text-ink-muted">
          {device === 'mobile' ? 'Base mobile geometry' : `${device} override (inherits mobile until edited)`}
        </p>
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
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Appearance</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <ColorField
            label="Background"
            name="inspector-appearance-background"
            onChange={(value) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, backgroundColor: value || undefined } })}
            placeholder="#ffffff"
            value={node.appearance?.backgroundColor ?? ''}
          />
          <ColorField
            label="Text color"
            name="inspector-appearance-text"
            onChange={(value) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, textColor: value || undefined } })}
            placeholder="#111827"
            value={node.appearance?.textColor ?? ''}
          />
          <ColorField
            label="Border color"
            name="inspector-appearance-border"
            onChange={(value) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, borderColor: value || undefined } })}
            placeholder="#d1d5db"
            value={node.appearance?.borderColor ?? ''}
          />
          <TextInput
            label="Corner radius"
            name="inspector-appearance-radius"
            onChange={(event) => {
              const value = numberFromEvent(event);
              if (value !== null) onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, borderRadius: Math.max(0, value) } });
            }}
            type="number"
            value={node.appearance?.borderRadius ?? 0}
          />
        </div>
        {isLayoutNode ? (
          <div className="mb-3">
            <p className="mb-2 text-xs font-medium text-ink-muted">Border style</p>
            <SegmentedControl
              ariaLabel="Border style"
              onChange={(borderStyle) => onAction({
                type: 'node/appearance',
                nodeId: node.id,
                appearance: { ...node.appearance, borderStyle },
              })}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'none', label: 'None' },
              ]}
              value={layoutBorderStyle}
            />
          </div>
        ) : null}
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
                  const dark = { ...node.appearance?.dark };
                  if (value) dark[key] = value;
                  else delete dark[key];
                  const hasColors = Object.keys(dark).length > 0;
                  onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, dark: hasColors ? dark : undefined } });
                }}
                placeholder="Inherit"
                value={node.appearance?.dark?.[key] ?? ''}
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
        {node.type === 'input' || node.type === 'container' || node.type === 'column' || node.type === 'row' || node.type === 'listview' || node.type === 'checkbox' || node.type === 'radio' || node.type === 'switch' || node.type === 'dropdown' || node.type === 'slider' || node.type === 'progress' || node.type === 'divider' || node.type === 'camera' ? (
          <p className="text-sm text-ink-muted">Fixed for the MVP.</p>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Behavior</p>
        {node.type !== 'gesture-detector' && node.type !== 'listview' ? (
          <button
            className="mb-3 w-full rounded-tile border border-hairline px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-canvas"
            onClick={() => onAction({ type: 'node/wrap-gesture-detector', nodeId: node.id })}
            type="button"
          >
            Wrap with Gesture Detector
          </button>
        ) : null}
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
      </div>
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
                <label className="grid gap-1 text-xs font-medium text-ink-muted">Type
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
    <label className="grid gap-1 text-xs font-medium text-ink-muted">{field.label}
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
}: {
  itemFrame: ListViewNode;
  onAction: (action: EditorAction) => void;
}) {
  return (
    <div className="mb-4 rounded-tile border border-hairline p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Item frame</p>
      <p className="mb-2 text-xs text-ink-muted">Applies to every repeated item.</p>
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
        Show dividers
      </label>
    </div>
  );
}
