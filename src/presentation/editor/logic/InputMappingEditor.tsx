import type { ComponentNode } from '@domain/entities/componentNode';
import type { LogicNode, ValueExpression } from '@domain/entities/logic';
import { CURRENT_ITEM_ID_FIELD } from '@domain/entities/logic';
import type { DataCollection } from '@domain/entities/appData';
import { nodeLayerName } from '../workspace/nodeLabels';
import { logicNodeTitle } from './logicLabels';

interface InputMappingEditorProps {
  inputKey: string;
  label: string;
  mapping?: ValueExpression;
  screenNodes: readonly ComponentNode[];
  logicNodes: readonly LogicNode[];
  currentNodeId: string;
  onChange: (mapping: ValueExpression | null) => void;
  itemFields?: readonly { id: string; label: string }[];
  collections?: readonly DataCollection[];
}

type MappingSource = 'static' | ValueExpression['source'];

export function InputMappingEditor({
  inputKey,
  label,
  mapping,
  screenNodes,
  logicNodes,
  currentNodeId,
  onChange,
  itemFields = [],
  collections = [],
}: InputMappingEditorProps) {
  const source: MappingSource = mapping?.source ?? 'static';
  const componentSources = screenNodes.filter((node) =>
    node.type === 'input' || node.type === 'text' || node.type === 'checkbox' ||
    node.type === 'radio' || node.type === 'switch' || node.type === 'dropdown' || node.type === 'slider' ||
    node.type === 'camera' || node.type === 'listview');
  const outputSources = logicNodes.filter((node) => node.id !== currentNodeId && node.kind === 'action');
  const selectedOutputNode = mapping?.source === 'node-output'
    ? outputSources.find((node) => node.id === mapping.nodeId)
    : undefined;
  const outputPaths = selectedOutputNode?.kind === 'action' ? knownOutputPaths(selectedOutputNode, collections) : [];
  const outputCollectionId = selectedOutputNode?.kind === 'action' && selectedOutputNode.payload.type === 'get-record'
    ? selectedOutputNode.payload.collectionId
    : '';
  const recordFields = collections.find((collection) => collection.id === outputCollectionId)?.fields ?? [];

  function changeSource(next: MappingSource): void {
    switch (next) {
      case 'static': onChange(null); break;
      case 'literal': onChange({ source: 'literal', value: '' }); break;
      case 'component': {
        const node = componentSources[0];
        onChange({ source: 'component', nodeId: node?.id ?? '', property: node?.type === 'text' ? 'text' : 'value' });
        break;
      }
      case 'list-item': onChange({ source: 'list-item', fieldId: itemFields[0]?.id ?? '' }); break;
      case 'session': onChange({ source: 'session', path: 'user.email' }); break;
      case 'variable': onChange({ source: 'variable', name: '' }); break;
      case 'node-output': onChange({ source: 'node-output', nodeId: outputSources[0]?.id ?? '', path: 'result' }); break;
    }
  }

  return (
    <fieldset className="rounded-tile border border-hairline p-2" data-input-key={inputKey}>
      <legend className="px-1 text-xs font-medium text-ink-muted">{label}</legend>
      <label className="text-[11px] font-medium text-ink-muted" htmlFor={`mapping-source-${currentNodeId}-${inputKey}`}>
        Use value from
      </label>
      <select
        aria-label="Value source"
        className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
        id={`mapping-source-${currentNodeId}-${inputKey}`}
        onChange={(event) => changeSource(event.target.value as MappingSource)}
        value={source}
      >
        <option value="static">Field value above</option>
        <option value="literal">Fixed value</option>
        <option value="component">Component value</option>
        {itemFields.length > 0 ? <option value="list-item">Current list item</option> : null}
        <option value="session">Session value</option>
        <option value="variable">Application variable</option>
        <option value="node-output">Earlier step result</option>
      </select>

      {mapping?.source === 'literal' ? (
        <input
          aria-label={`${label} mapped literal`}
          className="mt-2 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
          onChange={(event) => onChange({ ...mapping, value: event.target.value })}
          value={mapping.value}
        />
      ) : null}

      {mapping?.source === 'component' ? (
        <select
          aria-label={`${label} component source`}
          className="mt-2 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
          onChange={(event) => {
            const node = componentSources.find((candidate) => candidate.id === event.target.value);
            onChange({ source: 'component', nodeId: event.target.value, property: node?.type === 'text' ? 'text' : 'value' });
          }}
          value={mapping.nodeId}
        >
          <option value="">Choose component…</option>
          {componentSources.map((node) => <option key={node.id} value={node.id}>{nodeLayerName(node)}</option>)}
        </select>
      ) : null}

      {mapping?.source === 'list-item' ? (
        <select
          aria-label={`${label} list item field`}
          className="mt-2 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
          onChange={(event) => onChange({ source: 'list-item', fieldId: event.target.value })}
          value={mapping.fieldId}
        >
          <option value="">Choose item field…</option>
          <option value={CURRENT_ITEM_ID_FIELD}>Current item (automatic)</option>
          {itemFields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
        </select>
      ) : null}

      {mapping?.source === 'session' ? (
        <select
          aria-label={`${label} session source`}
          className="mt-2 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
          onChange={(event) => onChange({ source: 'session', path: event.target.value as Extract<ValueExpression, { source: 'session' }>['path'] })}
          value={mapping.path}
        >
          <option value="user.email">User email</option>
          <option value="user.name">User name</option>
          <option value="user.id">User ID</option>
        </select>
      ) : null}

      {mapping?.source === 'variable' ? (
        <input
          aria-label={`${label} variable name`}
          className="mt-2 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
          onChange={(event) => onChange({ source: 'variable', name: event.target.value })}
          placeholder="selectedNoteId"
          value={mapping.name}
        />
      ) : null}

      {mapping?.source === 'node-output' ? (
        <div className="mt-2 grid gap-2">
          <select
            aria-label={`${label} node output source`}
            className="h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
            onChange={(event) => onChange({ ...mapping, nodeId: event.target.value })}
            value={mapping.nodeId}
          >
            <option value="">Choose node…</option>
            {outputSources.map((node) => <option key={node.id} value={node.id}>{logicNodeTitle(node)}</option>)}
          </select>
          {recordFields.length > 0 ? (
            <select
              aria-label={`${label} record field`}
              className="h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
              onChange={(event) => onChange({ ...mapping, path: event.target.value })}
              value={recordFields.some((field) => mapping.path === `record.values.${field.id}`) ? mapping.path : ''}
            >
              <option value="">Choose a record field…</option>
              {recordFields.map((field) => <option key={field.id} value={`record.values.${field.id}`}>{field.label}</option>)}
            </select>
          ) : null}
          <input
            aria-label={`${label} output path`}
            className="h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
            list={`mapping-paths-${currentNodeId}-${inputKey}`}
            onChange={(event) => onChange({ ...mapping, path: event.target.value })}
            placeholder="result.id"
            value={mapping.path}
          />
          <datalist id={`mapping-paths-${currentNodeId}-${inputKey}`}>
            {outputPaths.map((path) => <option key={path} value={path} />)}
          </datalist>
        </div>
      ) : null}
    </fieldset>
  );
}

function knownOutputPaths(node: Extract<LogicNode, { kind: 'action' }>, collections: readonly DataCollection[]): string[] {
  switch (node.payload.type) {
    case 'document-load': return ['documents'];
    case 'text-split': return ['chunks'];
    case 'embedding-generate': return ['chunks', 'embeddings'];
    case 'vector-upsert': return ['insertedCount', 'updatedCount', 'indexName', 'namespace'];
    case 'vector-delete': return ['removedCount', 'documentId'];
    case 'chat-input': return ['question', 'conversationId'];
    case 'query-embedding': return ['question', 'embeddingReference'];
    case 'vector-retrieve':
    case 'rerank': return ['matches'];
    case 'prompt-template': return ['prompt', 'question', 'matches'];
    case 'llm-generate': return ['answer', 'citations', 'finishReason'];
    case 'chat-output': return ['answer', 'citations'];
    case 'memory': return ['conversationId', 'messages'];
    case 'vector-store': return ['insertedCount', 'updatedCount', 'removedCount', 'toolName'];
    case 'ai-agent': return ['answer', 'citations', 'toolCalls', 'messages', 'finishReason'];
    case 'chat-model': return ['chat-model'];
    case 'cv-liveness': return ['isLive', 'confidence', 'reason'];
    case 'cv-enroll': return ['credentialId', 'enrolledAt', 'qualityScore'];
    case 'cv-verify': return ['verified', 'confidence', 'credentialId', 'reason'];
    case 'get-record': {
      const collectionId = node.payload.collectionId;
      return [
        'record', 'record.id', 'record.values',
        ...(collections.find((collection) => collection.id === collectionId)?.fields
          .map((field) => `record.values.${field.id}`) ?? []),
      ];
    }
    case 'add-local-list-item': return [
      'item',
      'item.id',
      'item.listViewId',
      'item.values',
      ...[...new Set([
        ...Object.keys(node.payload.values),
        ...Object.keys(node.inputMappings ?? {}),
      ])].map((fieldId) => `item.values.${fieldId}`),
    ];
    default: return [];
  }
}
