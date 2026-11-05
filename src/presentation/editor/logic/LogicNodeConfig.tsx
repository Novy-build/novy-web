import type { ComponentNode } from '@domain/entities/componentNode';
import type { DataCollection } from '@domain/entities/appData';
import type {
  ActionPayload,
  Behavior,
  ConditionNode,
  LogicNode,
  TriggerEvent,
} from '@domain/entities/logic';
import { logicNodeTitle } from './logicLabels';
import { nodeDisplayLabel, nodeLayerName } from '../workspace/nodeLabels';

interface LogicNodeConfigProps {
  node: LogicNode | null;
  behavior: Behavior | null;
  /** Component id the behavior event is bound to (for the trigger caption). */
  screenNodes: readonly ComponentNode[];
  screens: { id: string; name: string }[];
  currentScreenId: string;
  onConfigure: (nodeId: string, payload: ActionPayload) => void;
  onConfigureCondition: (
    nodeId: string,
    patch: Partial<Pick<ConditionNode, 'left' | 'operator' | 'compareValue'>>,
  ) => void;
  onConfigureTrigger: (targetNodeId: string, event: TriggerEvent) => void;
  onRemoveSelected: () => void;
  onDeleteBehavior: () => void;
  collections?: readonly DataCollection[];
}

/**
 * Inspector (right panel) of the Logic workspace: inline config for the
 * selected graph card, or captions/hints when nothing is selected.
 */
export function LogicNodeConfig({
  node,
  behavior,
  screenNodes,
  screens,
  currentScreenId,
  onConfigure,
  onConfigureCondition,
  onConfigureTrigger,
  onRemoveSelected,
  onDeleteBehavior,
  collections = [],
}: LogicNodeConfigProps) {
  if (!behavior) {
    return <EmptyDetails />;
  }

  const triggerTarget = screenNodes.find((candidate) => candidate.id === behavior.targetNodeId);

  if (!node) {
    return (
      <EmptyDetails
        hint={triggerTarget ? `Select a step of “${behavior.name}” to edit it.` : undefined}
      />
    );
  }

  if (node.kind === 'trigger') {
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink">Trigger — {logicNodeTitle(node)}</h3>
        <p className="mt-2 text-sm text-ink-muted">Runs when {describeTriggerTarget(triggerTarget, behavior.event)}.</p>
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="trigger-event">Event</label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          id="trigger-event"
          onChange={(event) => onConfigureTrigger(behavior.targetNodeId, event.target.value as TriggerEvent)}
          value={behavior.event}
        >
          <option value="click">On Click</option>
          <option value="change">On Change</option>
          <option value="load">On Load</option>
        </select>
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="trigger-target">Target component</label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          id="trigger-target"
          onChange={(event) => onConfigureTrigger(event.target.value, behavior.event)}
          value={behavior.targetNodeId}
        >
          <option value="">Choose a component…</option>
          {screenNodes.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{nodeLayerName(candidate)}</option>
          ))}
        </select>
        <button
          className="mt-6 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-canvas"
          onClick={onDeleteBehavior}
          type="button"
        >
          Delete workflow
        </button>
      </div>
    );
  }

  if (node.kind === 'condition') {
    const needsValue = node.operator !== 'is-empty' && node.operator !== 'is-not-empty';
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink">If / Else</h3>
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="condition-source">
          Source component
        </label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          id="condition-source"
          onChange={(event) => {
            const target = screenNodes.find((candidate) => candidate.id === event.target.value);
            onConfigureCondition(node.id, {
              left: {
                source: 'component',
                nodeId: event.target.value,
                property: target?.type === 'text' ? 'text' : 'value',
              },
            });
          }}
          value={node.left.nodeId}
        >
          <option value="">Choose a component…</option>
          {screenNodes
            .filter((candidate) => candidate.type === 'input' || candidate.type === 'text')
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{nodeLayerName(candidate)}</option>
            ))}
        </select>

        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="condition-operator">
          Operator
        </label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          id="condition-operator"
          onChange={(event) =>
            onConfigureCondition(node.id, {
              operator: event.target.value as ConditionNode['operator'],
            })
          }
          value={node.operator}
        >
          <option value="equals">Equals</option>
          <option value="not-equals">Does not equal</option>
          <option value="contains">Contains</option>
          <option value="not-contains">Does not contain</option>
          <option value="is-empty">Is empty</option>
          <option value="is-not-empty">Is not empty</option>
        </select>

        {needsValue ? (
          <>
            <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="condition-value">
              Compare value
            </label>
            <input
              className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
              id="condition-value"
              onChange={(event) =>
                onConfigureCondition(node.id, { compareValue: event.target.value })
              }
              value={node.compareValue}
            />
          </>
        ) : null}

        <button
          className="mt-6 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm font-medium text-red-600 hover:bg-canvas"
          onClick={onRemoveSelected}
          type="button"
        >
          Remove condition
        </button>
      </div>
    );
  }

  const configure = (payload: ActionPayload): void => onConfigure(node.id, payload);
  const actionPayload = node.payload;
  const selectedDataCollection = isDataPayload(actionPayload)
    ? collections.find((collection) => collection.id === actionPayload.collectionId) ?? null
    : null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{logicNodeTitle(node)}</h3>
      {node.payload.type === 'change-text' ? (
        <>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-target">
            Target component
          </label>
          <select
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-target"
            onChange={(event) =>
              configure({
                type: 'change-text',
                targetNodeId: event.target.value,
                text: node.payload.type === 'change-text' ? node.payload.text : '',
              })
            }
            value={node.payload.targetNodeId}
          >
            <option value="">Choose a component…</option>
            {screenNodes
              .filter((candidate) => candidate.type === 'text')
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {nodeLayerName(candidate)}
                </option>
              ))}
          </select>

          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-text">
            New text
          </label>
          <input
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-text"
            onChange={(event) =>
              configure({
                type: 'change-text',
                targetNodeId: node.payload.type === 'change-text' ? node.payload.targetNodeId : '',
                text: event.target.value,
              })
            }
            value={node.payload.type === 'change-text' ? node.payload.text : ''}
          />
        </>
      ) : null}

      {node.payload.type === 'show-message' ? (
        <>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-message">
            Message
          </label>
          <input
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-message"
            onChange={(event) => configure({ type: 'show-message', message: event.target.value })}
            value={node.payload.message}
          />
        </>
      ) : null}

      {node.payload.type === 'navigate' ? (
        <>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-screen">
            Target screen
          </label>
          <select
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-screen"
            onChange={(event) =>
              configure({ type: 'navigate', targetScreenId: event.target.value })
            }
            value={node.payload.targetScreenId}
          >
            <option value="">Choose a screen…</option>
            {screens
              .filter((screen) => screen.id !== currentScreenId)
              .map((screen) => (
                <option key={screen.id} value={screen.id}>
                  {screen.name}
                </option>
              ))}
          </select>
        </>
      ) : null}

      {isDataPayload(actionPayload) ? (
        <>
          <p className="mt-3 rounded-md bg-brand-50 p-2 text-xs text-brand-700">
            Collections are configured in the Data workspace.
          </p>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-collection">
            Collection
          </label>
          <select
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-collection"
            onChange={(event) => configure({ ...actionPayload, collectionId: event.target.value })}
            value={actionPayload.collectionId}
          >
            <option value="">Choose a collection…</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>
          {'recordId' in actionPayload ? (
            <>
              <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-record-id">
                Record ID
              </label>
              <input
                className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="logic-record-id"
                onChange={(event) => configure({ ...actionPayload, recordId: event.target.value })}
                value={actionPayload.recordId}
              />
            </>
          ) : null}
          {'values' in actionPayload && selectedDataCollection ? (
            <div className="mt-4 grid gap-3">
              <p className="text-xs font-medium text-ink-muted">Field values</p>
              {selectedDataCollection.fields.map((field) => (
                <label className="text-xs font-medium text-ink-muted" key={field.id}>
                  {field.label}
                  <input
                    className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                    onChange={(event) => configure({
                      ...actionPayload,
                      values: { ...actionPayload.values, [field.id]: event.target.value },
                    })}
                    value={actionPayload.values[field.id] ?? ''}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <button
        className="mt-6 w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-canvas"
        onClick={onRemoveSelected}
        type="button"
      >
        Remove step
      </button>
    </div>
  );
}

function isDataPayload(
  payload: ActionPayload,
): payload is Extract<ActionPayload, { type: 'get-records' | 'insert-record' | 'update-record' | 'delete-record' }> {
  return payload.type === 'get-records' ||
    payload.type === 'insert-record' ||
    payload.type === 'update-record' ||
    payload.type === 'delete-record';
}

/** Verb phrase per event so captions read naturally ("Click me is clicked"). */
const TRIGGER_SUBJECT_VERB: Record<TriggerEvent, string> = {
  click: 'is clicked',
  change: 'changes',
  load: 'the screen loads',
};

function describeTriggerTarget(target: ComponentNode | undefined, event: TriggerEvent): string {
  const label = target ? nodeDisplayLabel(target) : 'the component';
  return `${label} ${TRIGGER_SUBJECT_VERB[event]}`;
}

function EmptyDetails({ hint }: { hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Details</h3>
      <p className="mt-2 text-sm text-ink-muted">
        {hint ?? 'Select a step in the graph to configure it.'}
      </p>
    </div>
  );
}
