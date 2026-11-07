import type { ChangeEvent } from 'react';
import type { CameraProps, ComponentNode, DividerProps, InputProps, ResponsiveBreakpoint } from '@domain/entities/componentNode';
import { geometryAtBreakpoint } from '@domain/entities/componentNode';
import type { DataCollection } from '@domain/entities/appData';
import type { Behavior } from '@domain/entities/logic';
import { TextInput } from '@presentation/components/ui/TextInput';
import type { EditorAction } from '../state/editorState';
import { NODE_TYPE_LABELS } from './nodeLabels';
import { TRIGGER_EVENT_LABELS } from '../logic/behaviorLabels';

interface InspectorProps {
  node: ComponentNode | null;
  /** All behaviors of the active screen, filtered for the selected node. */
  behaviors: readonly Behavior[];
  onAction: (action: EditorAction) => void;
  onOpenLogic: () => void;
  collections?: readonly DataCollection[];
  device?: ResponsiveBreakpoint;
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
}: InspectorProps) {
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
  const listCollectionSource = node.type === 'list' && node.props.dataSource?.kind === 'collection'
    ? node.props.dataSource
    : null;
  const formDataBinding = node.type === 'form' ? node.props.dataBinding ?? null : null;
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
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Button label"
            name="inspector-button-label"
            onChange={(event) => onAction({ type: 'node/props-button', nodeId: node.id, props: { label: event.target.value } })}
            value={node.props.label}
          />
        </div>
      ) : null}

      {node.type === 'text' ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Text content"
            name="inspector-text-content"
            onChange={(event) => onAction({ type: 'node/props-text', nodeId: node.id, props: { text: event.target.value } })}
            value={node.props.text}
          />
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

      {node.type === 'list' ? (
        <div className="mt-4 grid gap-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-list-source">Data source</label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-list-source"
            onChange={(event) => {
              if (event.target.value === 'static') {
                onAction({ type: 'node/props-list', nodeId: node.id, props: { dataSource: { kind: 'static' } } });
                return;
              }
              const collection = collections[0];
              onAction({
                type: 'node/props-list',
                nodeId: node.id,
                props: {
                  dataSource: {
                    kind: 'collection',
                    collectionId: collection?.id ?? '',
                    displayFieldId: collection?.fields[0]?.id ?? '',
                  },
                },
              });
            }}
            value={node.props.dataSource?.kind ?? 'static'}
          >
            <option value="static">Static items</option>
            <option value="collection">Collection</option>
          </select>
          {listCollectionSource ? (
            <>
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-list-collection">Collection</label>
              <select
                className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="inspector-list-collection"
                onChange={(event) => {
                  const collection = collections.find((item) => item.id === event.target.value);
                  onAction({ type: 'node/props-list', nodeId: node.id, props: { dataSource: { kind: 'collection', collectionId: event.target.value, displayFieldId: collection?.fields[0]?.id ?? '' } } });
                }}
                value={listCollectionSource.collectionId}
              >
                <option value="">Choose a collection…</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </select>
              <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-list-field">Display field</label>
              <select
                className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="inspector-list-field"
                onChange={(event) => onAction({ type: 'node/props-list', nodeId: node.id, props: { dataSource: { ...listCollectionSource, displayFieldId: event.target.value } } })}
                value={listCollectionSource.displayFieldId}
              >
                <option value="">Choose a field…</option>
                {collections.find((collection) => collection.id === listCollectionSource.collectionId)?.fields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
              </select>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.scrollable}
              onChange={(event) => onAction({ type: 'node/props-list', nodeId: node.id, props: { scrollable: event.target.checked } })}
              type="checkbox"
            />
            Scrollable
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={node.props.showDividers}
              onChange={(event) => onAction({ type: 'node/props-list', nodeId: node.id, props: { showDividers: event.target.checked } })}
              type="checkbox"
            />
            Show dividers
          </label>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="inspector-list-items">
            List items
          </label>
          <textarea
            className="h-24 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-brand-600"
            id="inspector-list-items"
            name="inspector-list-items"
            onChange={(event) =>
              onAction({
                type: 'node/props-list',
                nodeId: node.id,
                props: { items: event.target.value.split('\n') },
              })
            }
            value={node.props.items.join('\n')}
          />
          <p className="mt-1 text-xs text-ink-muted">One item per line.</p>
        </div>
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
        </div>
      ) : null}

      {node.type === 'dropdown' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
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
            onChange={(event) => onAction({ type: 'node/props-dropdown', nodeId: node.id, props: { options: event.target.value.split('\\n').filter((item) => item.trim().length > 0) } })}
            value={node.props.options.join('\\n')}
          />
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
          <p className="text-sm text-ink-muted">Containers have no content options in the MVP.</p>
        </div>
      ) : null}

      {node.type === 'form' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
          <TextInput
            label="Form title"
            name="inspector-form-title"
            onChange={(event) =>
              onAction({ type: 'node/props-form', nodeId: node.id, props: { title: event.target.value } })
            }
            value={node.props.title}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-form-fields">
            Field labels
          </label>
          <textarea
            className="h-24 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-brand-600"
            id="inspector-form-fields"
            onChange={(event) => {
              const labels = event.target.value.split('\n');
              onAction({
                type: 'node/props-form',
                nodeId: node.id,
                props: {
                  fields: labels.map((label, index) => ({
                    label,
                    placeholder: node.props.fields[index]?.placeholder ?? `Enter ${label.toLowerCase()}`,
                    type: node.props.fields[index]?.type ?? 'text',
                  })),
                },
              });
            }}
            value={node.props.fields.map((field) => field.label).join('\n')}
          />
          <p className="text-xs text-ink-muted">One field per line.</p>
          <TextInput
            label="Submit button label"
            name="inspector-form-submit-label"
            onChange={(event) =>
              onAction({
                type: 'node/props-form',
                nodeId: node.id,
                props: { submitLabel: event.target.value },
              })
            }
            value={node.props.submitLabel}
          />
          <label className="text-xs font-medium text-ink-muted" htmlFor="inspector-form-collection">Submit to collection</label>
          <select
            className="h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="inspector-form-collection"
            onChange={(event) => {
              const collection = collections.find((item) => item.id === event.target.value);
              onAction({
                type: 'node/props-form',
                nodeId: node.id,
                props: {
                  dataBinding: event.target.value
                    ? {
                        collectionId: event.target.value,
                        fields: node.props.fields.map((_, index) => ({
                          formFieldIndex: index,
                          dataFieldId: collection?.fields[index]?.id ?? '',
                        })),
                      }
                    : undefined,
                },
              });
            }}
            value={node.props.dataBinding?.collectionId ?? ''}
          >
            <option value="">No collection</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>
          {formDataBinding ? node.props.fields.map((field, index) => (
            <label className="text-xs font-medium text-ink-muted" key={`${field.label}-${index}`}>
              {field.label}
              <select
                className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                onChange={(event) => onAction({
                  type: 'node/props-form',
                  nodeId: node.id,
                  props: {
                    dataBinding: {
                      ...formDataBinding,
                      fields: formDataBinding.fields.map((binding) => binding.formFieldIndex === index ? { ...binding, dataFieldId: event.target.value } : binding),
                    },
                  },
                })}
                value={formDataBinding.fields.find((binding) => binding.formFieldIndex === index)?.dataFieldId ?? ''}
              >
                <option value="">Choose a field…</option>
                {collections.find((collection) => collection.id === formDataBinding.collectionId)?.fields.map((dataField) => <option key={dataField.id} value={dataField.id}>{dataField.label}</option>)}
              </select>
            </label>
          )) : null}
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
          <TextInput
            label="Background"
            name="inspector-appearance-background"
            onChange={(event) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, backgroundColor: event.target.value || undefined } })}
            placeholder="#ffffff"
            value={node.appearance?.backgroundColor ?? ''}
          />
          <TextInput
            label="Text color"
            name="inspector-appearance-text"
            onChange={(event) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, textColor: event.target.value || undefined } })}
            placeholder="#111827"
            value={node.appearance?.textColor ?? ''}
          />
          <TextInput
            label="Border color"
            name="inspector-appearance-border"
            onChange={(event) => onAction({ type: 'node/appearance', nodeId: node.id, appearance: { ...node.appearance, borderColor: event.target.value || undefined } })}
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
        {node.type === 'input' || node.type === 'container' || node.type === 'list' || node.type === 'form' || node.type === 'checkbox' || node.type === 'radio' || node.type === 'switch' || node.type === 'dropdown' || node.type === 'slider' || node.type === 'progress' || node.type === 'divider' || node.type === 'camera' ? (
          <p className="text-sm text-ink-muted">Fixed for the MVP.</p>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Behavior</p>
        {node.type === 'button' && behaviors.length > 0 ? (
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
