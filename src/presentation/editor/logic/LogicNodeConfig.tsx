import { FieldHelpLabel } from '@presentation/components/ui/FieldHelp';
import type { ComponentNode, ListViewItemField, ListViewNode } from '@domain/entities/componentNode';
import type { DataCollection, DataValue } from '@domain/entities/appData';
import type {
  ActionPayload,
  ActionInputMappings,
  Behavior,
  ConditionNode,
  LogicNode,
  TriggerEvent,
} from '@domain/entities/logic';
import { CURRENT_ITEM_ID_FIELD } from '@domain/entities/logic';
import type { RecordRouteParameter } from '@domain/entities/screen';
import type { RagFileSource, RagProfile } from '@domain/entities/rag';
import { logicNodeTitle } from './logicLabels';
import { nodeDisplayLabel, nodeLayerName } from '../workspace/nodeLabels';
import { InputMappingEditor } from './InputMappingEditor';
import { isGranularRagPayload, RagNodeConfig } from './RagNodeConfig';

interface LogicNodeConfigProps {
  node: LogicNode | null;
  behavior: Behavior | null;
  /** Component id the behavior event is bound to (for the trigger caption). */
  screenNodes: readonly ComponentNode[];
  screens: Array<{
    id: string;
    name: string;
    path: string;
    routeParameters?: RecordRouteParameter[];
  }>;
  currentScreenId: string;
  onConfigure: (nodeId: string, payload: ActionPayload) => void;
  onConfigureInputMappings: (nodeId: string, inputMappings: ActionInputMappings) => void;
  onConfigureCondition: (
    nodeId: string,
    patch: Partial<Pick<ConditionNode, 'left' | 'operator' | 'compareValue'>>,
  ) => void;
  onConfigureTrigger: (targetNodeId: string, event: TriggerEvent) => void;
  onRemoveSelected: () => void;
  onDeleteBehavior: () => void;
  collections?: readonly DataCollection[];
  currentItemCollection?: DataCollection | null;
  logicNodes: readonly LogicNode[];
  listItemFields?: readonly { id: string; label: string }[];
  /** Backend-owned RAG connection profiles. */
  profiles?: readonly RagProfile[];
  /** Project-scoped RAG document sources. */
  fileSources?: readonly RagFileSource[];
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
  onConfigureInputMappings,
  onConfigureCondition,
  onConfigureTrigger,
  onRemoveSelected,
  onDeleteBehavior,
  collections = [],
  currentItemCollection = null,
  logicNodes,
  listItemFields = [],
  profiles = [],
  fileSources = [],
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
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="trigger-event"><FieldHelpLabel label="Event" /></label>
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
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="trigger-target"><FieldHelpLabel label="Target component" /></label>
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
    const sourceNodes = screenNodes.filter((candidate) =>
      candidate.type === 'input' || candidate.type === 'text' || candidate.type === 'dropdown' ||
      candidate.type === 'switch' || candidate.type === 'checkbox' || candidate.type === 'listview');
    return (
      <div>
        <h3 className="text-sm font-semibold text-ink">If / Else</h3>
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="condition-source-type"><FieldHelpLabel label="Value source" /></label>
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          id="condition-source-type"
          onChange={(event) => {
            const source = event.target.value;
            if (source === 'component') {
              const target = sourceNodes[0];
              onConfigureCondition(node.id, { left: { source: 'component', nodeId: target?.id ?? '', property: target?.type === 'text' ? 'text' : 'value' } });
            } else if (source === 'variable') {
              onConfigureCondition(node.id, { left: { source: 'variable', name: '' } });
            } else if (source === 'node-output') {
              onConfigureCondition(node.id, { left: { source: 'node-output', nodeId: '', path: '' } });
            } else if (source === 'list-item') {
              onConfigureCondition(node.id, { left: { source: 'list-item', fieldId: CURRENT_ITEM_ID_FIELD } });
            }
          }}
          value={node.left.source === 'variable' || node.left.source === 'node-output' || node.left.source === 'list-item' ? node.left.source : 'component'}
        >
          <option value="component">Component value</option>
          <option value="variable">Application variable</option>
          <option value="node-output">Previous node output</option>
          {listItemFields.length > 0 ? <option value="list-item">Current list item</option> : null}
        </select>
        {node.left.source === 'component' ? (
          <>
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="condition-source">
          <FieldHelpLabel label="Source component" />
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
          value={node.left.source === 'component' ? node.left.nodeId : ''}
        >
          <option value="">Choose a component…</option>
          {sourceNodes.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{nodeLayerName(candidate)}</option>
            ))}
        </select>
          </>
        ) : null}
        {node.left.source === 'variable' ? (
          <label className="mt-4 block text-xs font-medium text-ink-muted"><FieldHelpLabel label="Variable name" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => onConfigureCondition(node.id, { left: { source: 'variable', name: event.target.value } })} value={node.left.name} />
          </label>
        ) : null}
        {node.left.source === 'node-output' ? (
          <div className="mt-4 grid gap-2">
            <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="Source node" />
              <select className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => onConfigureCondition(node.id, { left: { source: 'node-output', nodeId: event.target.value, path: node.left.source === 'node-output' ? node.left.path : '' } })} value={node.left.nodeId}>
                <option value="">Choose node…</option>
                {logicNodes.filter((candidate) => candidate.kind === 'action').map((candidate) => <option key={candidate.id} value={candidate.id}>{logicNodeTitle(candidate)}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="Output path" />
              <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => onConfigureCondition(node.id, { left: { source: 'node-output', nodeId: node.left.source === 'node-output' ? node.left.nodeId : '', path: event.target.value } })} value={node.left.path} />
            </label>
          </div>
        ) : null}
        {node.left.source === 'list-item' ? (
          <label className="mt-4 block text-xs font-medium text-ink-muted"><FieldHelpLabel label="Current item field" />
            <select className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => onConfigureCondition(node.id, { left: { source: 'list-item', fieldId: event.target.value } })} value={node.left.fieldId}>
              <option value={CURRENT_ITEM_ID_FIELD}>Current item ID</option>
              {listItemFields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
            </select>
          </label>
        ) : null}

        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="condition-operator">
          <FieldHelpLabel label="Operator" />
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
              <FieldHelpLabel label="Compare value" />
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
  const navigationScreen = actionPayload.type === 'navigate'
    ? screens.find((screen) => screen.id === actionPayload.targetScreenId) ?? null
    : null;
  const navigationRecordParameter = actionPayload.type === 'navigate' && actionPayload.recordContext
    ? navigationScreen?.routeParameters?.find((parameter) =>
        parameter.source.collectionId === actionPayload.recordContext?.collectionId) ?? null
    : null;
  const emailPayload = actionPayload.type === 'send-email' ? actionPayload : null;
  const selectedDataCollection = isDataPayload(actionPayload)
    ? collections.find((collection) => collection.id === actionPayload.collectionId) ?? null
    : null;
  const staticListViews = screenNodes.filter((candidate): candidate is ListViewNode =>
    candidate.type === 'listview' && candidate.props.dataSource.kind === 'static');
  const selectedLocalListView = actionPayload.type === 'add-local-list-item'
    ? staticListViews.find((candidate) => candidate.id === actionPayload.targetNodeId) ?? null
    : null;
  const currentRecordMapping = node.inputMappings?.['$recordId'];
  const isAutomaticCurrentItem = currentRecordMapping?.source === 'list-item' &&
    currentRecordMapping.fieldId === CURRENT_ITEM_ID_FIELD &&
    currentItemCollection !== null && (
      (isDataPayload(actionPayload) && 'recordId' in actionPayload && actionPayload.collectionId === currentItemCollection.id) ||
      (actionPayload.type === 'navigate' && actionPayload.recordContext?.collectionId === currentItemCollection.id)
    );

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{logicNodeTitle(node)}</h3>
      {isAutomaticCurrentItem ? (
        <p className="mt-3 rounded-md bg-brand-50 p-2 text-xs font-medium text-brand-700">
          Current {singularize(currentItemCollection.name)} selected automatically
        </p>
      ) : null}
      {node.payload.type === 'change-text' ? (
        <>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-target">
            <FieldHelpLabel label="Target component" />
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
            <FieldHelpLabel label="New text" />
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
            <FieldHelpLabel label="Message" />
          </label>
          <input
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-message"
            onChange={(event) => configure({ type: 'show-message', message: event.target.value })}
            value={node.payload.message}
          />
        </>
      ) : null}

      {node.payload.type === 'set-theme' ? (
        <>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-theme">
            <FieldHelpLabel label="Theme" />
          </label>
          <select
            className="mt-1 h-11 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-theme"
            onChange={(event) => configure({
              type: 'set-theme',
              theme: event.target.value as Extract<ActionPayload, { type: 'set-theme' }>['theme'],
            })}
            value={node.payload.theme}
          >
            <option value="toggle">Toggle light and dark</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Follow system</option>
          </select>
          <p className="mt-2 text-xs text-ink-muted">System follows the visitor’s operating-system preference.</p>
        </>
      ) : null}

      {node.payload.type === 'navigate' ? (
        <>
          <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-screen">
            <FieldHelpLabel label="Target screen" />
          </label>
          <select
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-screen"
            onChange={(event) =>
              configure({
                type: 'navigate',
                targetScreenId: event.target.value,
                ...(actionPayload.type === 'navigate' && actionPayload.recordContext
                  ? { recordContext: actionPayload.recordContext }
                  : {}),
              })
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
          {node.payload.recordContext && navigationScreen && navigationRecordParameter ? (
            <div className="mt-3 rounded-md bg-brand-50 p-2 text-xs text-brand-700">
              <p>Route: <span className="font-mono">{navigationScreen.path}</span></p>
              <p className="mt-1">
                {navigationRecordParameter.name}: Current item ID
                <span className="ml-1 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold">Automatic</span>
              </p>
            </div>
          ) : node.payload.recordContext && navigationScreen ? (
            <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
              This screen has no record ID route yet. Choose a dedicated detail screen so the backend can build a record URL.
            </p>
          ) : null}
        </>
      ) : null}

      {isDataPayload(actionPayload) ? (
        <>
          <p className="mt-3 rounded-md bg-brand-50 p-2 text-xs text-brand-700">
            Collections are configured in the Data workspace.
          </p>
           {!isAutomaticCurrentItem ? <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-collection">
             <FieldHelpLabel label="Collection" />
           </label> : null}
           {!isAutomaticCurrentItem ? <select
            className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-collection"
            onChange={(event) => configure({ ...actionPayload, collectionId: event.target.value })}
            value={actionPayload.collectionId}
          >
            <option value="">Choose a collection…</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
           </select> : null}
           {'recordId' in actionPayload && !isAutomaticCurrentItem ? (
            <>
              <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="logic-record-id">
                <FieldHelpLabel label="Record ID" />
              </label>
              <input
                className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                id="logic-record-id"
                onChange={(event) => configure({ ...actionPayload, recordId: event.target.value })}
                value={actionPayload.recordId}
              />
            </>
          ) : null}
          {actionPayload.type === 'delete-record' ? (
            <label className="mt-4 flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
              <input checked={actionPayload.confirm === true} onChange={(event) => configure({ ...actionPayload, confirm: event.target.checked })} type="checkbox" />
              <FieldHelpLabel label="Confirm before deleting" />
            </label>
          ) : null}
          {'values' in actionPayload && selectedDataCollection ? (
            <div className="mt-4 grid gap-3">
              <p className="text-xs font-medium text-ink-muted">Field values</p>
              {selectedDataCollection.fields.map((field) => (
                <RecordFieldInput
                  field={field}
                  key={field.id}
                  onChange={(value) => configure({
                    ...actionPayload,
                    values: { ...actionPayload.values, [field.id]: value },
                  })}
                  value={actionPayload.values[field.id] ?? ''}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {isGranularRagPayload(actionPayload) ? (
        <RagNodeConfig
          collections={collections}
          fileSources={fileSources}
          onChange={(next) => configure(next)}
          payload={actionPayload}
          profiles={profiles}
          screenNodes={screenNodes}
        />
      ) : null}

      {actionPayload.type === 'set-variable' ? (
        <div className="mt-4 grid gap-3">
          <label className="block text-xs font-medium text-ink-muted"><FieldHelpLabel label="Variable name" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...actionPayload, name: event.target.value })} value={actionPayload.name} />
          </label>
          <label className="block text-xs font-medium text-ink-muted"><FieldHelpLabel label="Default value" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...actionPayload, value: event.target.value })} value={actionPayload.value} />
          </label>
        </div>
      ) : null}
      {actionPayload.type === 'set-component-value' ? (
        <div className="mt-4 grid gap-3">
          <label className="block text-xs font-medium text-ink-muted"><FieldHelpLabel label="Target component" />
            <select className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...actionPayload, targetNodeId: event.target.value })} value={actionPayload.targetNodeId}>
              <option value="">Choose a component…</option>
              {screenNodes.filter((candidate) => candidate.type === 'input' || candidate.type === 'listview').map((candidate) => <option key={candidate.id} value={candidate.id}>{nodeLayerName(candidate)}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted"><FieldHelpLabel label="Default value" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...actionPayload, value: event.target.value })} value={actionPayload.value} />
          </label>
        </div>
      ) : null}

      {actionPayload.type === 'add-local-list-item' ? (
        <div className="mt-4 grid gap-3">
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Runtime only. This adds a temporary item for the current app session and does not save
            to a collection or modify Project JSON.
          </p>
          <label className="text-xs font-medium text-ink-muted" htmlFor="logic-local-listview">
            <FieldHelpLabel label="Static ListView" />
          </label>
          <select
            className="h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-local-listview"
            onChange={(event) => {
              const target = staticListViews.find((candidate) => candidate.id === event.target.value);
              configure({
                ...actionPayload,
                targetNodeId: event.target.value,
                values: target?.props.dataSource.kind === 'static'
                  ? Object.fromEntries(target.props.dataSource.fields
                    .filter((field) => actionPayload.values[field.id] !== undefined)
                    .map((field) => [field.id, actionPayload.values[field.id]!]))
                  : {},
              });
            }}
            value={actionPayload.targetNodeId}
          >
            <option value="">Choose a static ListView…</option>
            {staticListViews.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{nodeLayerName(candidate)}</option>
            ))}
          </select>
          {staticListViews.length === 0 ? (
            <p className="text-xs text-ink-muted">Add a static ListView to this screen first. Collection-bound ListViews use Insert Record.</p>
          ) : null}
          <label className="text-xs font-medium text-ink-muted" htmlFor="logic-local-list-placement">
            <FieldHelpLabel label="Placement" />
          </label>
          <select
            className="h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            id="logic-local-list-placement"
            onChange={(event) => configure({
              ...actionPayload,
              placement: event.target.value as 'append' | 'prepend',
            })}
            value={actionPayload.placement}
          >
            <option value="append">Append</option>
            <option value="prepend">Prepend</option>
          </select>
          {selectedLocalListView?.props.dataSource.kind === 'static' ? (
            <div className="grid gap-3">
              <p className="text-xs font-medium text-ink-muted">Static field values</p>
              {selectedLocalListView.props.dataSource.fields.map((field) => (
                <LocalListFieldInput
                  field={field}
                  key={field.id}
                  onChange={(value) => configure({
                    ...actionPayload,
                    values: { ...actionPayload.values, [field.id]: value },
                  })}
                  value={actionPayload.values[field.id] ?? null}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actionPayload.type === 'cv-liveness' || actionPayload.type === 'cv-enroll' || actionPayload.type === 'cv-verify' ? (
        <div className="mt-4 grid gap-3">
          <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="Media reference" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...actionPayload, mediaReference: event.target.value })} value={actionPayload.mediaReference} />
          </label>
          {actionPayload.type === 'cv-enroll' ? (
            <p className="text-xs text-ink-muted">Enrollment uses the authenticated app user. Map Consent to an explicit runtime Checkbox; a saved builder setting is not proof of user consent.</p>
          ) : null}
          {actionPayload.type === 'cv-verify' ? (
            <>
              <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="User ID" />
                <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...actionPayload, userId: event.target.value })} value={actionPayload.userId ?? ''} />
              </label>
              <p className="text-xs text-ink-muted">The protected runtime resolves the enrolled credential and enforces its verification threshold. Client configuration cannot weaken either value.</p>
            </>
          ) : null}
          <p className="text-xs text-ink-muted">Preview simulates biometric processing; raw images and templates stay in the protected backend.</p>
        </div>
      ) : null}

      {emailPayload ? (
        <div className="mt-4 grid gap-3">
          <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="Recipient" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...emailPayload, to: event.target.value })} value={emailPayload.to} />
          </label>
          <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="Subject" />
            <input className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink" onChange={(event) => configure({ ...emailPayload, subject: event.target.value })} value={emailPayload.subject} />
          </label>
          <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label="Body" />
            <textarea className="mt-1 min-h-20 w-full rounded-tile border border-hairline bg-surface px-2 py-2 text-sm text-ink" onChange={(event) => configure({ ...emailPayload, body: event.target.value })} value={emailPayload.body} />
          </label>
          <p className="text-xs text-ink-muted">Preview simulates delivery; only the backend runtime may send email.</p>
        </div>
      ) : null}

      {actionInputDefinitions(actionPayload, selectedDataCollection, selectedLocalListView).length > 0 ? (
        <div className="mt-5 grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Input mapping</p>
          {actionInputDefinitions(actionPayload, selectedDataCollection, selectedLocalListView)
            .filter((input) => !(isAutomaticCurrentItem && input.key === '$recordId'))
            .map((input) => (
            <InputMappingEditor
              collections={collections}
              currentNodeId={node.id}
              inputKey={input.key}
              itemFields={listItemFields}
              key={input.key}
              label={input.label}
              logicNodes={logicNodes}
              mapping={node.inputMappings?.[input.key]}
              onChange={(mapping) => {
                const next = { ...(node.inputMappings ?? {}) };
                if (mapping) next[input.key] = mapping;
                else delete next[input.key];
                onConfigureInputMappings(node.id, next);
              }}
              screenNodes={screenNodes}
            />
          ))}
        </div>
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
): payload is Extract<ActionPayload, { type: 'get-records' | 'get-record' | 'insert-record' | 'update-record' | 'delete-record' | 'refresh-collection' }> {
  return payload.type === 'get-records' ||
    payload.type === 'get-record' ||
    payload.type === 'insert-record' ||
    payload.type === 'update-record' ||
    payload.type === 'delete-record' ||
    payload.type === 'refresh-collection';
}

function actionInputDefinitions(
  payload: ActionPayload,
  collection: DataCollection | null,
  localListView: ListViewNode | null,
): Array<{ key: string; label: string }> {
  switch (payload.type) {
    case 'change-text': return [{ key: 'text', label: 'New text' }];
    case 'show-message': return [{ key: 'message', label: 'Message' }];
    case 'send-email': return [
      { key: 'to', label: 'Recipient' },
      { key: 'subject', label: 'Subject' },
      { key: 'body', label: 'Body' },
    ];
    case 'insert-record': return collection?.fields.map((field) => ({ key: field.id, label: field.label })) ?? [];
    case 'add-local-list-item': return localListView?.props.dataSource.kind === 'static'
      ? localListView.props.dataSource.fields.map((field) => ({ key: field.id, label: field.label }))
      : [];
    case 'update-record': return [
      { key: '$recordId', label: 'Record ID' },
      ...(collection?.fields.map((field) => ({ key: field.id, label: field.label })) ?? []),
    ];
    case 'delete-record':
    case 'get-record': return [{ key: '$recordId', label: 'Record ID' }];
    case 'cv-liveness': return [{ key: 'mediaReference', label: 'Camera media' }];
    case 'cv-enroll': return [
      { key: 'mediaReference', label: 'Camera media' },
      { key: 'consent', label: 'Biometric consent' },
    ];
    case 'cv-verify': return [
      { key: 'mediaReference', label: 'Camera media' },
      { key: 'userId', label: 'User ID' },
    ];
    case 'document-load': return [
      { key: 'sourceReference', label: 'Source reference' },
      { key: 'documentId', label: 'Document ID' },
      { key: 'title', label: 'Title' },
      { key: 'text', label: 'Document text' },
    ];
    case 'document-upload': return [{ key: 'mediaReference', label: 'File media' }];
    case 'text-split': return [{ key: 'documents', label: 'Documents' }];
    case 'embedding-generate': return [{ key: 'chunks', label: 'Text chunks' }];
    case 'vector-upsert': return [
      { key: 'chunks', label: 'Text chunks' },
      { key: 'embeddings', label: 'Embeddings' },
    ];
    case 'vector-delete': return [{ key: 'documentId', label: 'Document ID' }];
    case 'chat-input': return [
      { key: 'question', label: 'Question' },
      { key: 'conversationId', label: 'Conversation ID' },
    ];
    case 'query-embedding': return [{ key: 'question', label: 'Question' }];
    case 'vector-retrieve': return [
      { key: 'question', label: 'Question' },
      { key: 'queryEmbedding', label: 'Query embedding' },
    ];
    case 'rerank': return [
      { key: 'question', label: 'Question' },
      { key: 'matches', label: 'Retrieved matches' },
    ];
    case 'prompt-template': return [
      { key: 'question', label: 'Question' },
      { key: 'matches', label: 'Context matches' },
    ];
    case 'llm-generate': return [
      { key: 'prompt', label: 'Compiled prompt' },
      { key: 'matches', label: 'Citation matches' },
      { key: 'messages', label: 'Memory messages' },
    ];
    case 'chat-output': return [
      { key: 'answer', label: 'Generated answer' },
      { key: 'citations', label: 'Citations' },
    ];
    case 'chat-message': return [
      { key: 'text', label: 'Message text' },
      { key: 'citations', label: 'Citations' },
    ];
    case 'memory': return [
      { key: 'conversationId', label: 'Conversation ID' },
      { key: 'messages', label: 'Messages' },
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer' },
    ];
    case 'vector-store': return payload.operation === 'delete'
      ? [{ key: 'documentId', label: 'Document ID' }]
      : [];
    case 'ai-agent': return [
      { key: 'question', label: 'Question' },
      { key: 'conversationId', label: 'Conversation ID' },
    ];
    case 'chat-model': return [];
    case 'set-variable': return [{ key: 'value', label: 'Variable value' }];
    case 'set-component-value': return [{ key: 'value', label: 'Component value' }];
    case 'navigate':
    case 'get-records':
    case 'refresh-collection':
      return [];
    default:
      return [];
  }
}

function RecordFieldInput({
  field,
  value,
  onChange,
}: {
  field: DataCollection['fields'][number];
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="text-xs font-medium text-ink-muted">
       <FieldHelpLabel label={field.label} />
        <select
          className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option value="">Choose…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }
  return (
    <label className="text-xs font-medium text-ink-muted">
     <FieldHelpLabel label={field.label} />
      <input
        className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
        onChange={(event) => onChange(event.target.value)}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value}
      />
    </label>
  );
}

function singularize(value: string): string {
  if (/ies$/i.test(value)) return `${value.slice(0, -3)}y`;
  if (/s$/i.test(value) && !/ss$/i.test(value)) return value.slice(0, -1);
  return value || 'item';
}

function LocalListFieldInput({
  field,
  value,
  onChange,
}: {
  field: ListViewItemField;
  value: DataValue;
  onChange: (value: DataValue) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
        <input checked={value === true} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
       <FieldHelpLabel label={field.label} />
      </label>
    );
  }
  return (
    <label className="text-xs font-medium text-ink-muted">
     <FieldHelpLabel label={field.label} />
      <input
        className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
        onChange={(event) => onChange(
          field.type === 'number'
            ? event.target.value === '' ? null : Number(event.target.value)
            : event.target.value,
        )}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      />
    </label>
  );
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
