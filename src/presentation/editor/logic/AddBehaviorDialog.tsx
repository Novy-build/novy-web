import { FieldHelpLabel } from '@presentation/components/ui/FieldHelp';
import type { ComponentNode } from '@domain/entities/componentNode';
import type { TriggerEvent } from '@domain/entities/logic';
import { Modal } from '@presentation/components/system/Modal';
import { nodeLayerName } from '../workspace/nodeLabels';
import { TRIGGER_EVENT_LABELS } from './behaviorLabels';

interface AddBehaviorDialogProps {
  /** Flat nodes of the active screen: the target component options. */
  screenNodes: readonly ComponentNode[];
  /** Pre-selected target when opened from the canvas ⚡ toolbar. */
  defaultTargetNodeId: string | null;
  onCreate: (targetNodeId: string, event: TriggerEvent) => void;
  onClose: () => void;
}

/**
 * Binds a component event to a new behavior graph. The trigger event is
 * chosen here; the graph starts with a matching trigger node.
 */
export function AddBehaviorDialog({ screenNodes, defaultTargetNodeId, onCreate, onClose }: AddBehaviorDialogProps) {
  const initialTarget = defaultTargetNodeId ?? '';
  const hasComponents = screenNodes.length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const targetNodeId = String(data.get('targetNodeId') ?? '');
    const eventValue = String(data.get('event') ?? 'click') as TriggerEvent;
    if (targetNodeId.length > 0) {
      onCreate(targetNodeId, eventValue);
    }
  }

  return (
    <Modal labelledBy="add-behavior-title" onClose={onClose} panelClassName="max-w-sm">
      <h2 className="text-lg font-semibold text-ink" id="add-behavior-title">
        New behavior
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Pick a component and what should start the chain.
      </p>
      {!hasComponents ? (
        <p className="mt-3 rounded-tile border border-hairline bg-canvas p-3 text-sm text-ink-muted" role="status">
          Add a component in Design mode before creating a behavior.
        </p>
      ) : null}
      <form aria-label="New behavior form" id="add-behavior-form" onSubmit={handleSubmit}>
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="behavior-component">
          <FieldHelpLabel label="Component" />
        </label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          defaultValue={initialTarget}
          disabled={!hasComponents}
          id="behavior-component"
          name="targetNodeId"
        >
          <option value="">Choose a component…</option>
          {screenNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {nodeLayerName(node)}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="behavior-event">
          <FieldHelpLabel label="Trigger" />
        </label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          defaultValue="click"
          disabled={!hasComponents}
          id="behavior-event"
          name="event"
        >
          {(Object.keys(TRIGGER_EVENT_LABELS) as TriggerEvent[]).map((event) => (
            <option key={event} value={event}>
              {TRIGGER_EVENT_LABELS[event]}
            </option>
          ))}
        </select>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-tile px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-tile bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            disabled={!hasComponents}
            type="submit"
          >
            Add behavior
          </button>
        </div>
      </form>
    </Modal>
  );
}
