import type { ChangeEvent } from 'react';
import type { ComponentNode } from '@domain/entities/componentNode';
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
export function Inspector({ node: candidate, behaviors, onAction, onOpenLogic }: InspectorProps) {
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
      x: actionX ?? node.x,
      y: actionY ?? node.y,
    });
  }

  function resizeBy(actionW: number | null, actionH: number | null): void {
    if (actionW === null && actionH === null) {
      return;
    }
    onAction({
      type: 'node/layout-size',
      nodeId: node.id,
      w: actionW ?? node.w,
      h: actionH ?? node.h,
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

      {node.type === 'list' ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Content</p>
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
        </div>
      ) : null}

      <div aria-label="Layout" className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label="X"
            name="inspector-geometry-x"
            onChange={(event) => moveBy(numberFromEvent(event), null)}
            type="number"
            value={node.x}
          />
          <TextInput
            label="Y"
            name="inspector-geometry-y"
            onChange={(event) => moveBy(null, numberFromEvent(event))}
            type="number"
            value={node.y}
          />
          <TextInput
            label="Width"
            name="inspector-geometry-w"
            onChange={(event) => resizeBy(numberFromEvent(event), null)}
            type="number"
            value={node.w}
          />
          <TextInput
            label="Height"
            name="inspector-geometry-h"
            onChange={(event) => resizeBy(null, numberFromEvent(event))}
            type="number"
            value={node.h}
          />
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Appearance</p>
        {node.type === 'button' ? (
          <SegmentedControl
            ariaLabel="Button variant"
            onChange={(variant) => onAction({ type: 'node/props-button', nodeId: node.id, props: { variant } })}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'outline', label: 'Outline' },
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
        {node.type === 'input' || node.type === 'container' || node.type === 'list' || node.type === 'form' ? (
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
