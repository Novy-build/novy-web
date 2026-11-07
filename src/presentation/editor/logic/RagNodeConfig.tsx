import type { ComponentNode } from '@domain/entities/componentNode';
import type { ActionPayload } from '@domain/entities/logic';
import type { DataCollection } from '@domain/entities/appData';
import { nodeLayerName } from '../workspace/nodeLabels';

export type GranularRagPayload = Extract<ActionPayload, {
  type:
    | 'document-load' | 'text-split' | 'embedding-generate' | 'vector-upsert'
    | 'vector-delete' | 'chat-input' | 'query-embedding' | 'vector-retrieve'
    | 'rerank' | 'prompt-template' | 'llm-generate' | 'chat-output' | 'memory'
    | 'vector-store' | 'chat-model' | 'ai-agent';
}>;

export function isGranularRagPayload(payload: ActionPayload): payload is GranularRagPayload {
  return [
    'document-load', 'text-split', 'embedding-generate', 'vector-upsert', 'vector-delete',
    'chat-input', 'query-embedding', 'vector-retrieve', 'rerank', 'prompt-template',
    'llm-generate', 'chat-output', 'memory',
    'vector-store', 'chat-model', 'ai-agent',
  ].includes(payload.type);
}

export function RagNodeConfig({
  payload,
  screenNodes,
  collections,
  onChange,
}: {
  payload: GranularRagPayload;
  screenNodes: readonly ComponentNode[];
  collections: readonly DataCollection[];
  onChange: (payload: GranularRagPayload) => void;
}) {
  switch (payload.type) {
    case 'document-load':
      return <ConfigGrid>
        <SelectField label="Source" value={payload.source} onChange={(value) => onChange({ ...payload, source: value as typeof payload.source })} options={[
          ['previous-output', 'Previous database/action output'], ['inline', 'Inline text'], ['url', 'URL'], ['collection', 'Project collection'], ['file-reference', 'File reference'],
        ]} />
        {payload.source === 'collection' ? <SelectField label="Collection" value={payload.collectionId ?? ''} onChange={(collectionId) => onChange({ ...payload, collectionId })} options={collections.map((item) => [item.id, item.name])} /> : null}
        {payload.source === 'url' || payload.source === 'file-reference' ? <TextField label="Source reference" value={payload.sourceReference} onChange={(sourceReference) => onChange({ ...payload, sourceReference })} /> : null}
        <TextField label="Document ID" value={payload.documentId} onChange={(documentId) => onChange({ ...payload, documentId })} />
        <TextField label="Title" value={payload.title} onChange={(title) => onChange({ ...payload, title })} />
        {payload.source === 'inline' ? <TextAreaField label="Document text" value={payload.text} onChange={(text) => onChange({ ...payload, text })} /> : null}
      </ConfigGrid>;
    case 'text-split':
      return <ConfigGrid>
        <SelectField label="Strategy" value={payload.strategy} onChange={(strategy) => onChange({ ...payload, strategy: strategy as typeof payload.strategy })} options={[
          ['recursive-character', 'Recursive character'], ['token', 'Token'],
        ]} />
        <NumberField label="Chunk size" value={payload.chunkSize} onChange={(chunkSize) => onChange({ ...payload, chunkSize })} />
        <NumberField label="Chunk overlap" value={payload.chunkOverlap} onChange={(chunkOverlap) => onChange({ ...payload, chunkOverlap })} />
      </ConfigGrid>;
    case 'embedding-generate':
    case 'query-embedding':
      return <ConfigGrid>
        <TextField label="Connection profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <TextField label="Model" value={payload.model} onChange={(model) => onChange({ ...payload, model })} />
        {payload.type === 'embedding-generate' ? <NumberField label="Batch size" value={payload.batchSize} onChange={(batchSize) => onChange({ ...payload, batchSize })} /> : null}
      </ConfigGrid>;
    case 'vector-upsert':
    case 'vector-delete':
    case 'vector-retrieve':
      return <ConfigGrid>
        <TextField label="Vector-store profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <TextField label="Index name" value={payload.indexName} onChange={(indexName) => onChange({ ...payload, indexName })} />
        <TextField label="Namespace" value={payload.namespace} onChange={(namespace) => onChange({ ...payload, namespace })} />
        {payload.type === 'vector-delete' ? <TextField label="Document ID" value={payload.documentId} onChange={(documentId) => onChange({ ...payload, documentId })} /> : null}
        {payload.type === 'vector-retrieve' ? <>
          <NumberField label="Top K" value={payload.topK} onChange={(topK) => onChange({ ...payload, topK })} />
          <NumberField label="Minimum score" value={payload.minimumScore} onChange={(minimumScore) => onChange({ ...payload, minimumScore })} step="0.05" />
        </> : null}
      </ConfigGrid>;
    case 'chat-input':
      return <ConfigGrid>
        <SelectField label="Question component" value={payload.componentId} onChange={(componentId) => onChange({ ...payload, componentId })} options={screenNodes.filter((node) => node.type === 'input').map((node) => [node.id, nodeLayerName(node)])} />
        <TextAreaField label="Fallback/static question" value={payload.staticQuestion} onChange={(staticQuestion) => onChange({ ...payload, staticQuestion })} />
      </ConfigGrid>;
    case 'rerank':
      return <ConfigGrid>
        <TextField label="Reranker profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <TextField label="Model" value={payload.model} onChange={(model) => onChange({ ...payload, model })} />
        <NumberField label="Top N" value={payload.topN} onChange={(topN) => onChange({ ...payload, topN })} />
        <NumberField label="Minimum score" value={payload.minimumScore} onChange={(minimumScore) => onChange({ ...payload, minimumScore })} step="0.05" />
      </ConfigGrid>;
    case 'prompt-template':
      return <ConfigGrid>
        <TextAreaField label="Prompt template" value={payload.template} onChange={(template) => onChange({ ...payload, template })} />
        <TextField label="Context separator" value={payload.contextSeparator} onChange={(contextSeparator) => onChange({ ...payload, contextSeparator })} />
        <SelectField label="Empty context" value={payload.emptyContextBehavior} onChange={(emptyContextBehavior) => onChange({ ...payload, emptyContextBehavior: emptyContextBehavior as typeof payload.emptyContextBehavior })} options={[
          ['return-empty', 'Return no-context answer'], ['answer-without-context', 'Allow answer without context'],
        ]} />
      </ConfigGrid>;
    case 'llm-generate':
      return <ConfigGrid>
        <TextField label="LLM profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <TextField label="Model" value={payload.model} onChange={(model) => onChange({ ...payload, model })} />
        <TextAreaField label="System prompt" value={payload.systemPrompt} onChange={(systemPrompt) => onChange({ ...payload, systemPrompt })} />
        <NumberField label="Temperature" value={payload.temperature} onChange={(temperature) => onChange({ ...payload, temperature })} step="0.1" />
        <NumberField label="Max tokens" value={payload.maxTokens} onChange={(maxTokens) => onChange({ ...payload, maxTokens })} />
      </ConfigGrid>;
    case 'chat-output':
      return <ConfigGrid>
        <SelectField label="Answer Text component" value={payload.targetNodeId} onChange={(targetNodeId) => onChange({ ...payload, targetNodeId })} options={screenNodes.filter((node) => node.type === 'text').map((node) => [node.id, nodeLayerName(node)])} />
        <SelectField label="Citation Repeater" value={payload.citationsNodeId ?? ''} onChange={(citationsNodeId) => onChange({ ...payload, citationsNodeId: citationsNodeId || undefined })} options={screenNodes.filter((node) => node.type === 'repeater').map((node) => [node.id, nodeLayerName(node)])} />
      </ConfigGrid>;
    case 'memory':
      return <ConfigGrid>
        <SelectField label="Operation" value={payload.operation} onChange={(operation) => onChange({ ...payload, operation: operation as typeof payload.operation })} options={[['load', 'Load'], ['append', 'Append'], ['clear', 'Clear']]} />
        <TextField label="Memory profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <SelectField label="Scope" value={payload.scope} onChange={(scope) => onChange({ ...payload, scope: scope as typeof payload.scope })} options={[['session', 'Session'], ['user', 'User'], ['conversation', 'Conversation']]} />
        <NumberField label="Window size" value={payload.windowSize} onChange={(windowSize) => onChange({ ...payload, windowSize })} />
      </ConfigGrid>;
    case 'vector-store':
      return <ConfigGrid>
        <SelectField label="Operation" value={payload.operation} onChange={(operation) => onChange({ ...payload, operation: operation as typeof payload.operation })} options={[
          ['upsert', 'Upsert documents'], ['delete', 'Delete document'], ['retrieve-tool', 'Retriever tool'],
        ]} />
        <TextField label="Vector-store profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <TextField label="Index name" value={payload.indexName} onChange={(indexName) => onChange({ ...payload, indexName })} />
        <TextField label="Namespace" value={payload.namespace} onChange={(namespace) => onChange({ ...payload, namespace })} />
        {payload.operation === 'upsert' ? <>
          <SelectField label="Document input" value={payload.documentInputMode} onChange={(documentInputMode) => onChange({ ...payload, documentInputMode: documentInputMode as typeof payload.documentInputMode })} options={[
            ['previous-output', 'Previous database/action output'], ['document-loader', 'Attached Document Loader'],
          ]} />
          <SelectField label="Conflict mode" value={payload.conflictMode} onChange={(conflictMode) => onChange({ ...payload, conflictMode: conflictMode as typeof payload.conflictMode })} options={[["upsert", 'Upsert'], ['replace', 'Replace document chunks']]} />
        </> : null}
        {payload.operation === 'delete' ? <TextField label="Document ID" value={payload.documentId} onChange={(documentId) => onChange({ ...payload, documentId })} /> : null}
        {payload.operation === 'retrieve-tool' ? <>
          <NumberField label="Top K" value={payload.topK} onChange={(topK) => onChange({ ...payload, topK })} />
          <NumberField label="Minimum score" value={payload.minimumScore} onChange={(minimumScore) => onChange({ ...payload, minimumScore })} step="0.05" />
        </> : null}
      </ConfigGrid>;
    case 'chat-model':
      return <ConfigGrid>
        <TextField label="Chat-model profile ID" value={payload.connectionProfileId} onChange={(connectionProfileId) => onChange({ ...payload, connectionProfileId })} />
        <TextField label="Model" value={payload.model} onChange={(model) => onChange({ ...payload, model })} />
        <NumberField label="Temperature" value={payload.temperature} onChange={(temperature) => onChange({ ...payload, temperature })} step="0.1" />
        <NumberField label="Max tokens" value={payload.maxTokens} onChange={(maxTokens) => onChange({ ...payload, maxTokens })} />
      </ConfigGrid>;
    case 'ai-agent':
      return <ConfigGrid>
        <TextAreaField label="Agent instructions" value={payload.instructions} onChange={(instructions) => onChange({ ...payload, instructions })} />
        <NumberField label="Maximum iterations" value={payload.maxIterations} onChange={(maxIterations) => onChange({ ...payload, maxIterations })} />
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <input checked={payload.returnIntermediateSteps} onChange={(event) => onChange({ ...payload, returnIntermediateSteps: event.target.checked })} type="checkbox" />
          Return intermediate tool steps
        </label>
      </ConfigGrid>;
  }
}

function ConfigGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 grid gap-3">{children}<p className="text-xs text-ink-muted">Connection profiles are backend-owned; never paste API keys here.</p></div>;
}

const fieldClass = 'mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink';
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-ink-muted">{label}<input className={fieldClass} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}
function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-ink-muted">{label}<textarea className={`${fieldClass} min-h-20 py-2`} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}
function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="text-xs font-medium text-ink-muted">{label}<input className={fieldClass} onChange={(event) => onChange(Number(event.target.value) || 0)} step={step} type="number" value={value} /></label>;
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-ink-muted">{label}<select className={fieldClass} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Choose…</option>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
