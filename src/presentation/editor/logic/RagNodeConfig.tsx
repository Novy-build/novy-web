import { FieldHelpLabel } from '@presentation/components/ui/FieldHelp';
import type { ComponentNode } from '@domain/entities/componentNode';
import type { ActionPayload } from '@domain/entities/logic';
import type { DataCollection } from '@domain/entities/appData';
import type { RagFileSource, RagProfile } from '@domain/entities/rag';
import { nodeLayerName } from '../workspace/nodeLabels';

export type GranularRagPayload = Extract<ActionPayload, {
  type:
    | 'document-load' | 'text-split' | 'embedding-generate' | 'vector-upsert'
    | 'vector-delete' | 'chat-input' | 'query-embedding' | 'vector-retrieve'
    | 'rerank' | 'prompt-template' | 'llm-generate' | 'chat-output' | 'memory'
    | 'vector-store' | 'chat-model' | 'ai-agent' | 'document-upload' | 'chat-message';
}>;

export function isGranularRagPayload(payload: ActionPayload): payload is GranularRagPayload {
  return [
    'document-load', 'text-split', 'embedding-generate', 'vector-upsert', 'vector-delete',
    'chat-input', 'query-embedding', 'vector-retrieve', 'rerank', 'prompt-template',
    'llm-generate', 'chat-output', 'memory',
    'vector-store', 'chat-model', 'ai-agent',
    'document-upload', 'chat-message',
  ].includes(payload.type);
}

/** Maps a node to the backend connection-profile capability it requires. */
export function ragProfileCapability(
  payload: GranularRagPayload,
): RagProfile['capability'] | null {
  switch (payload.type) {
    case 'embedding-generate':
    case 'query-embedding':
      return 'embedding';
    case 'rerank':
      return 'reranking';
    case 'vector-store':
    case 'vector-upsert':
    case 'vector-delete':
    case 'vector-retrieve':
      return 'vector';
    case 'memory':
      return 'memory';
    case 'chat-model':
    case 'llm-generate':
      return 'chat';
    default:
      return null;
  }
}

export function RagNodeConfig({
  payload,
  screenNodes,
  collections,
  profiles = [],
  fileSources = [],
  onChange,
}: {
  payload: GranularRagPayload;
  screenNodes: readonly ComponentNode[];
  collections: readonly DataCollection[];
  profiles?: readonly RagProfile[];
  fileSources?: readonly RagFileSource[];
  onChange: (payload: GranularRagPayload) => void;
}) {
  const capability = ragProfileCapability(payload);
  const matchingProfiles = capability
    ? profiles.filter((profile) => profile.capability === capability)
    : [];
  const selectedProfile = matchingProfiles.find(
    (profile) => profile.id === currentProfileId(payload),
  );

  return (
    <>
      {switchOnPayload(payload, { screenNodes, collections, matchingProfiles, selectedProfile, fileSources, onChange })}
    </>
  );
}

interface SwitchContext {
  screenNodes: readonly ComponentNode[];
  collections: readonly DataCollection[];
  matchingProfiles: readonly RagProfile[];
  selectedProfile?: RagProfile;
  fileSources: readonly RagFileSource[];
  onChange: (payload: GranularRagPayload) => void;
}

function switchOnPayload(payload: GranularRagPayload, context: SwitchContext) {
  switch (payload.type) {
    case 'document-load':
      return <DocumentLoadFields payload={payload} context={context} />;
    case 'document-upload':
      return (
        <ConfigGrid>
          <p className="rounded-md bg-blue-50 p-2 text-xs text-blue-800">
            Map a File input component to mediaReference under Dynamic inputs. Uploaded files are extracted by the runtime and the binary is discarded.
          </p>
        </ConfigGrid>
      );
    case 'text-split':
      return <TextSplitFields payload={payload} context={context} />;
    case 'embedding-generate':
    case 'query-embedding':
      return <EmbeddingFields payload={payload} context={context} />;
    case 'vector-upsert':
    case 'vector-delete':
    case 'vector-retrieve':
      return <LegacyVectorFields payload={payload} context={context} />;
    case 'chat-input':
      return <ChatInputFields payload={payload} context={context} />;
    case 'rerank':
      return <RerankFields payload={payload} context={context} />;
    case 'prompt-template':
      return <PromptTemplateFields payload={payload} context={context} />;
    case 'llm-generate':
      return <LegacyLlmFields payload={payload} context={context} />;
    case 'chat-output':
      return <ChatOutputFields payload={payload} context={context} />;
    case 'chat-message':
      return (
        <ConfigGrid>
          <SelectField
            label="Chat widget"
            onChange={(targetNodeId) => context.onChange({ ...payload, targetNodeId })}
            options={context.screenNodes.filter((node) => node.type === 'chat').map((node) => [node.id, nodeLayerName(node)])}
            value={payload.targetNodeId}
          />
          <SelectField
            label="Role"
            onChange={(role) => context.onChange({ ...payload, role: role as typeof payload.role })}
            options={[["user", "User"], ["assistant", "Assistant"]]}
            value={payload.role}
          />
          <TextAreaField
            label="Fallback text"
            onChange={(text) => context.onChange({ ...payload, text })}
            value={payload.text}
          />
        </ConfigGrid>
      );
    case 'memory':
      return <MemoryFields payload={payload} context={context} />;
    case 'vector-store':
      return <VectorStoreFields payload={payload} context={context} />;
    case 'chat-model':
      return <ChatModelFields payload={payload} context={context} />;
    case 'ai-agent':
      return (
        <ConfigGrid>
          <TextAreaField
            label="Agent instructions"
            onChange={(instructions) => context.onChange({ ...payload, instructions })}
            value={payload.instructions}
          />
          <NumberField
            label="Maximum iterations"
            onChange={(maxIterations) => context.onChange({ ...payload, maxIterations })}
            value={payload.maxIterations}
          />
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              checked={payload.returnIntermediateSteps}
              onChange={(event) => context.onChange({ ...payload, returnIntermediateSteps: event.target.checked })}
              type="checkbox"
            />
            <FieldHelpLabel label="Return intermediate tool steps" />
          </label>
        </ConfigGrid>
      );
  }
}

function DocumentLoadFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'document-load' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <SelectField
        label="Source"
        onChange={(value) => context.onChange({ ...payload, source: value as typeof payload.source })}
        options={[
          ['previous-output', 'Previous database/action output'],
          ['inline', 'Inline text'],
          ['url', 'URL'],
          ['collection', 'Project collection'],
          ['file-reference', 'File reference'],
        ]}
        value={payload.source}
      />
      {payload.source === 'collection' ? (
        <SelectField
          label="Collection"
          onChange={(collectionId) => context.onChange({ ...payload, collectionId })}
          options={context.collections.map((item) => [item.id, item.name])}
          value={payload.collectionId ?? ''}
        />
      ) : null}
      {payload.source === 'collection' ? (
        <>
          <SelectField
            label="Content field"
            onChange={(contentFieldId) => context.onChange({ ...payload, contentFieldId })}
            options={collectionFieldOptions(payload.collectionId, context)}
            value={payload.contentFieldId ?? ''}
          />
          <SelectField
            label="Title field"
            onChange={(titleFieldId) => context.onChange({ ...payload, titleFieldId })}
            options={collectionFieldOptions(payload.collectionId, context)}
            value={payload.titleFieldId ?? ''}
          />
          <SelectField
            label="Document ID field"
            onChange={(documentIdFieldId) => context.onChange({ ...payload, documentIdFieldId })}
            options={collectionFieldOptions(payload.collectionId, context)}
            value={payload.documentIdFieldId ?? ''}
          />
        </>
      ) : null}
      {payload.source === 'url' || payload.source === 'file-reference' ? (
        payload.source === 'url' ? (
          <TextField
            label="Source URL"
            onChange={(sourceReference) => context.onChange({ ...payload, sourceReference })}
            value={payload.sourceReference}
          />
        ) : (
          <SelectField
            label="Uploaded file"
            onChange={(sourceReference) => context.onChange({ ...payload, sourceReference })}
            options={context.fileSources.map((source) => [source.id, source.filename])}
            value={payload.sourceReference}
          />
        )
      ) : null}
      {payload.source === 'file-reference' && context.fileSources.length === 0 ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          Upload a document source from the project Data panel before selecting a file reference.
        </p>
      ) : null}
      <TextField
        label="Document ID"
        onChange={(documentId) => context.onChange({ ...payload, documentId })}
        value={payload.documentId}
      />
      <TextField
        label="Title"
        onChange={(title) => context.onChange({ ...payload, title })}
        value={payload.title}
      />
      {payload.source === 'inline' ? (
        <TextAreaField
          label="Document text"
          onChange={(text) => context.onChange({ ...payload, text })}
          value={payload.text}
        />
      ) : null}
    </ConfigGrid>
  );
}

function TextSplitFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'text-split' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <SelectField
        label="Strategy"
        onChange={(value) => context.onChange({ ...payload, strategy: value as typeof payload.strategy })}
        options={[
          ['recursive-character', 'Recursive character'],
          ['token', 'Token'],
        ]}
        value={payload.strategy}
      />
      <NumberField
        label="Chunk size"
        onChange={(chunkSize) => context.onChange({ ...payload, chunkSize })}
        value={payload.chunkSize}
      />
      <NumberField
        label="Chunk overlap"
        onChange={(chunkOverlap) => context.onChange({ ...payload, chunkOverlap })}
        value={payload.chunkOverlap}
      />
    </ConfigGrid>
  );
}

function EmbeddingFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'embedding-generate' | 'query-embedding' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <ProfileField
        capability="embedding"
        label="Embedding profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <ModelField
        label="Model"
        onChange={(model) => context.onChange({ ...payload, model })}
        profile={context.selectedProfile}
        value={payload.model}
      />
      {payload.type === 'embedding-generate' ? (
        <NumberField
          label="Batch size"
          onChange={(batchSize) => context.onChange({ ...payload, batchSize })}
          value={payload.batchSize}
        />
      ) : null}
    </ConfigGrid>
  );
}

function LegacyVectorFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'vector-upsert' | 'vector-delete' | 'vector-retrieve' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <ProfileField
        capability="vector"
        label="Vector-store profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <TextField
        label="Index name"
        onChange={(indexName) => context.onChange({ ...payload, indexName })}
        value={payload.indexName}
      />
      <TextField
        label="Namespace"
        onChange={(namespace) => context.onChange({ ...payload, namespace })}
        value={payload.namespace}
      />
      {payload.type === 'vector-delete' ? (
        <TextField
          label="Document ID"
          onChange={(documentId) => context.onChange({ ...payload, documentId })}
          value={payload.documentId}
        />
      ) : null}
      {payload.type === 'vector-retrieve' ? (
        <>
          <NumberField
            label="Top K"
            onChange={(topK) => context.onChange({ ...payload, topK })}
            value={payload.topK}
          />
          <NumberField
            label="Minimum score"
            onChange={(minimumScore) => context.onChange({ ...payload, minimumScore })}
            step="0.05"
            value={payload.minimumScore}
          />
        </>
      ) : null}
    </ConfigGrid>
  );
}

function ChatInputFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'chat-input' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <SelectField
        label="Question component"
        onChange={(componentId) => context.onChange({ ...payload, componentId })}
        options={context.screenNodes
          .filter((node) => node.type === 'input')
          .map((node) => [node.id, nodeLayerName(node)])}
        value={payload.componentId}
      />
      <TextAreaField
        label="Fallback/static question"
        onChange={(staticQuestion) => context.onChange({ ...payload, staticQuestion })}
        value={payload.staticQuestion}
      />
    </ConfigGrid>
  );
}

function RerankFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'rerank' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <ProfileField
        capability="reranking"
        label="Reranker profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <ModelField
        label="Model"
        onChange={(model) => context.onChange({ ...payload, model })}
        profile={context.selectedProfile}
        value={payload.model}
      />
      <NumberField
        label="Top N"
        onChange={(topN) => context.onChange({ ...payload, topN })}
        value={payload.topN}
      />
      <NumberField
        label="Minimum score"
        onChange={(minimumScore) => context.onChange({ ...payload, minimumScore })}
        step="0.05"
        value={payload.minimumScore}
      />
    </ConfigGrid>
  );
}

function PromptTemplateFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'prompt-template' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <TextAreaField
        label="Prompt template"
        onChange={(template) => context.onChange({ ...payload, template })}
        value={payload.template}
      />
      <TextField
        label="Context separator"
        onChange={(contextSeparator) => context.onChange({ ...payload, contextSeparator })}
        value={payload.contextSeparator}
      />
      <SelectField
        label="Empty context"
        onChange={(value) =>
          context.onChange({ ...payload, emptyContextBehavior: value as typeof payload.emptyContextBehavior })}
        options={[
          ['return-empty', 'Return no-context answer'],
          ['answer-without-context', 'Allow answer without context'],
        ]}
        value={payload.emptyContextBehavior}
      />
    </ConfigGrid>
  );
}

function LegacyLlmFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'llm-generate' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <ProfileField
        capability="chat"
        label="LLM profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <ModelField
        label="Model"
        onChange={(model) => context.onChange({ ...payload, model })}
        profile={context.selectedProfile}
        value={payload.model}
      />
      <TextAreaField
        label="System prompt"
        onChange={(systemPrompt) => context.onChange({ ...payload, systemPrompt })}
        value={payload.systemPrompt}
      />
      <NumberField
        label="Temperature"
        onChange={(temperature) => context.onChange({ ...payload, temperature })}
        step="0.1"
        value={payload.temperature}
      />
      <NumberField
        label="Max tokens"
        onChange={(maxTokens) => context.onChange({ ...payload, maxTokens })}
        value={payload.maxTokens}
      />
    </ConfigGrid>
  );
}

function ChatOutputFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'chat-output' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <SelectField
        label="Answer Text component"
        onChange={(targetNodeId) => context.onChange({ ...payload, targetNodeId })}
        options={context.screenNodes
          .filter((node) => node.type === 'text')
          .map((node) => [node.id, nodeLayerName(node)])}
        value={payload.targetNodeId}
      />
      <SelectField
        label="Citation ListView"
        onChange={(citationsNodeId) =>
          context.onChange({ ...payload, citationsNodeId: citationsNodeId || undefined })}
        options={context.screenNodes
          .filter((node) => node.type === 'listview')
          .map((node) => [node.id, nodeLayerName(node)])}
        value={payload.citationsNodeId ?? ''}
      />
    </ConfigGrid>
  );
}

function MemoryFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'memory' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <SelectField
        label="Operation"
        onChange={(value) => context.onChange({ ...payload, operation: value as typeof payload.operation })}
        options={[
          ['load', 'Load'],
          ['append', 'Append'],
          ['clear', 'Clear'],
        ]}
        value={payload.operation}
      />
      <ProfileField
        capability="memory"
        label="Memory profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <SelectField
        label="Scope"
        onChange={(value) => context.onChange({ ...payload, scope: value as typeof payload.scope })}
        options={[
          ['session', 'Session'],
          ['user', 'User'],
          ['conversation', 'Conversation'],
        ]}
        value={payload.scope}
      />
      <NumberField
        label="Window size"
        onChange={(windowSize) => context.onChange({ ...payload, windowSize })}
        value={payload.windowSize}
      />
    </ConfigGrid>
  );
}

function VectorStoreFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'vector-store' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <SelectField
        label="Operation"
        onChange={(value) => context.onChange({ ...payload, operation: value as typeof payload.operation })}
        options={[
          ['upsert', 'Upsert documents'],
          ['delete', 'Delete document'],
          ['retrieve-tool', 'Retriever tool'],
        ]}
        value={payload.operation}
      />
      <ProfileField
        capability="vector"
        label="Vector-store profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <TextField
        label="Index name"
        onChange={(indexName) => context.onChange({ ...payload, indexName })}
        value={payload.indexName}
      />
      <TextField
        label="Namespace"
        onChange={(namespace) => context.onChange({ ...payload, namespace })}
        value={payload.namespace}
      />
      {payload.operation === 'upsert' ? (
        <>
          <SelectField
            label="Document input"
            onChange={(value) =>
              context.onChange({ ...payload, documentInputMode: value as typeof payload.documentInputMode })}
            options={[
              ['previous-output', 'Previous database/action output'],
              ['document-loader', 'Attached Document Loader'],
            ]}
            value={payload.documentInputMode}
          />
          <SelectField
            label="Conflict mode"
            onChange={(value) =>
              context.onChange({ ...payload, conflictMode: value as typeof payload.conflictMode })}
            options={[
              ['upsert', 'Upsert'],
              ['replace', 'Replace document chunks'],
            ]}
            value={payload.conflictMode}
          />
        </>
      ) : null}
      {payload.operation === 'delete' ? (
        <TextField
          label="Document ID"
          onChange={(documentId) => context.onChange({ ...payload, documentId })}
          value={payload.documentId}
        />
      ) : null}
      {payload.operation === 'retrieve-tool' ? (
        <>
          <NumberField
            label="Top K"
            onChange={(topK) => context.onChange({ ...payload, topK })}
            value={payload.topK}
          />
          <NumberField
            label="Minimum score"
            onChange={(minimumScore) => context.onChange({ ...payload, minimumScore })}
            step="0.05"
            value={payload.minimumScore}
          />
        </>
      ) : null}
    </ConfigGrid>
  );
}

function ChatModelFields({
  payload,
  context,
}: {
  payload: Extract<GranularRagPayload, { type: 'chat-model' }>;
  context: SwitchContext;
}) {
  return (
    <ConfigGrid>
      <ProfileField
        capability="chat"
        label="Chat-model profile"
        onChange={(connectionProfileId) => context.onChange({ ...payload, connectionProfileId })}
        profiles={context.matchingProfiles}
        value={payload.connectionProfileId}
      />
      <ModelField
        label="Model"
        onChange={(model) => context.onChange({ ...payload, model })}
        profile={context.selectedProfile}
        value={payload.model}
      />
      <NumberField
        label="Temperature"
        onChange={(temperature) => context.onChange({ ...payload, temperature })}
        step="0.1"
        value={payload.temperature}
      />
      <NumberField
        label="Max tokens"
        onChange={(maxTokens) => context.onChange({ ...payload, maxTokens })}
        value={payload.maxTokens}
      />
    </ConfigGrid>
  );
}

function ProfileField({
  label,
  capability,
  profiles,
  value,
  onChange,
}: {
  label: string;
  capability: RagProfile['capability'];
  profiles: readonly RagProfile[];
  value: string;
  onChange: (value: string) => void;
}) {
  const known = profiles.some((profile) => profile.id === value);
  return (
    <>
      <SelectField
        label={label}
        onChange={onChange}
        options={profiles.map((profile) => [
          profile.id,
          `${profile.name}${profile.available ? '' : ' (unavailable)'}`,
        ])}
        value={value}
      />
      {value && !known ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          The saved profile “{value}” is not offered by the backend. Choose another profile to
          keep this node runnable.
        </p>
      ) : null}
      {profiles.length === 0 ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          The backend does not offer a {capability} profile yet. This node cannot run until one is
          configured.
        </p>
      ) : null}
    </>
  );
}

function ModelField({
  label,
  profile,
  value,
  onChange,
}: {
  label: string;
  profile?: RagProfile;
  value: string;
  onChange: (value: string) => void;
}) {
  const models = profile?.models ?? [];
  if (models.length === 0) {
    return (
      <TextField
        label={label}
        onChange={onChange}
        value={value}
      />
    );
  }
  return (
    <SelectField
      label={label}
      onChange={onChange}
      options={models.map((model) => [model, model])}
      value={value || profile?.defaultModel || ''}
    />
  );
}

function collectionFieldOptions(
  collectionId: string | undefined,
  context: SwitchContext,
): ReadonlyArray<readonly [string, string]> {
  const collection = context.collections.find((item) => item.id === collectionId);
  return (collection?.fields ?? []).map((field) => [field.id, field.label]);
}

function currentProfileId(payload: GranularRagPayload): string {
  switch (payload.type) {
    case 'embedding-generate':
    case 'query-embedding':
    case 'vector-upsert':
    case 'vector-delete':
    case 'vector-retrieve':
    case 'rerank':
    case 'llm-generate':
    case 'memory':
    case 'vector-store':
    case 'chat-model':
      return payload.connectionProfileId;
    default:
      return '';
  }
}

function ConfigGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 grid gap-3">
      {children}
      <p className="text-xs text-ink-muted">
        Connection profiles are backend-owned; never paste API keys here.
      </p>
    </div>
  );
}

const fieldClass =
  'mt-1 h-9 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink';
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label={label} /><input className={fieldClass} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}
function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label={label} /><textarea className={`${fieldClass} min-h-20 py-2`} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}
function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label={label} /><input className={fieldClass} onChange={(event) => onChange(Number(event.target.value) || 0)} step={step} type="number" value={value} /></label>;
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-ink-muted"><FieldHelpLabel label={label} /><select className={fieldClass} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Choose…</option>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
