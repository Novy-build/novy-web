import type { ComponentNode } from '@domain/entities/componentNode';
import type { LogicNode, ValueExpression } from '@domain/entities/logic';
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
}: InputMappingEditorProps) {
  const source: MappingSource = mapping?.source ?? 'static';
  const componentSources = screenNodes.filter((node) =>
    node.type === 'input' || node.type === 'text' || node.type === 'checkbox' ||
    node.type === 'radio' || node.type === 'switch' || node.type === 'dropdown' || node.type === 'slider');
  const outputSources = logicNodes.filter((node) => node.id !== currentNodeId && node.kind === 'action');

  function changeSource(next: MappingSource): void {
    switch (next) {
      case 'static': onChange(null); break;
      case 'literal': onChange({ source: 'literal', value: '' }); break;
      case 'component': {
        const node = componentSources[0];
        onChange({ source: 'component', nodeId: node?.id ?? '', property: node?.type === 'text' ? 'text' : 'value' });
        break;
      }
      case 'session': onChange({ source: 'session', path: 'user.email' }); break;
      case 'node-output': onChange({ source: 'node-output', nodeId: outputSources[0]?.id ?? '', path: 'result' }); break;
    }
  }

  return (
    <fieldset className="rounded-tile border border-hairline p-2" data-input-key={inputKey}>
      <legend className="px-1 text-xs font-medium text-ink-muted">{label}</legend>
      <label className="text-[11px] font-medium text-ink-muted" htmlFor={`mapping-source-${currentNodeId}-${inputKey}`}>
        Value source
      </label>
      <select
        className="mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
        id={`mapping-source-${currentNodeId}-${inputKey}`}
        onChange={(event) => changeSource(event.target.value as MappingSource)}
        value={source}
      >
        <option value="static">Static action value</option>
        <option value="literal">Mapped literal</option>
        <option value="component">Component value</option>
        <option value="session">Session value</option>
        <option value="node-output">Previous node output</option>
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
          <input
            aria-label={`${label} output path`}
            className="h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-xs text-ink"
            onChange={(event) => onChange({ ...mapping, path: event.target.value })}
            placeholder="result.id"
            value={mapping.path}
          />
        </div>
      ) : null}
    </fieldset>
  );
}
