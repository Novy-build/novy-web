import type { ActionInputMappings, ActionPayload, TriggerEvent } from '@domain/entities/logic';

export type LogicNodeCategory =
  | 'Components'
  | 'Current item'
  | 'Triggers'
  | 'Flow'
  | 'UI'
  | 'Database'
  | 'Actions'
  | 'RAG Nodes'
  | 'Computer Vision';

export type LogicLibraryNode =
  | { kind: 'trigger'; event: TriggerEvent; targetNodeId?: string }
  | { kind: 'condition' }
  | { kind: 'action'; payload: ActionPayload; inputMappings?: ActionInputMappings };

export interface LogicNodeDefinition {
  id: string;
  category: LogicNodeCategory;
  label: string;
  description: string;
  icon: string;
  keywords: readonly string[];
  create: () => LogicLibraryNode;
}

export const LOGIC_NODE_MIME = 'application/x-novy-logic-node';

export const LOGIC_NODE_DEFINITIONS: readonly LogicNodeDefinition[] = [
  {
    id: 'trigger-click',
    category: 'Triggers',
    label: 'On Click',
    description: 'Start when a component is clicked',
    icon: '↗',
    keywords: ['trigger', 'button', 'tap'],
    create: () => ({ kind: 'trigger', event: 'click' }),
  },
  {
    id: 'trigger-change',
    category: 'Triggers',
    label: 'On Change',
    description: 'Start when an input value changes',
    icon: '↻',
    keywords: ['trigger', 'input', 'value'],
    create: () => ({ kind: 'trigger', event: 'change' }),
  },
  {
    id: 'trigger-load',
    category: 'Triggers',
    label: 'On Load',
    description: 'Start when the screen loads',
    icon: '▶',
    keywords: ['trigger', 'screen', 'page'],
    create: () => ({ kind: 'trigger', event: 'load' }),
  },
  {
    id: 'if-else',
    category: 'Flow',
    label: 'If / Else',
    description: 'Branch through true or false outputs',
    icon: '◇',
    keywords: ['condition', 'branch', 'compare'],
    create: () => ({ kind: 'condition' }),
  },
  {
    id: 'change-text',
    category: 'UI',
    label: 'Change Text',
    description: 'Replace the content of a Text component',
    icon: 'T',
    keywords: ['text', 'label', 'content'],
    create: () => ({ kind: 'action', payload: { type: 'change-text', targetNodeId: '', text: '' } }),
  },
  {
    id: 'show-message',
    category: 'UI',
    label: 'Show Message',
    description: 'Display a message in the running app',
    icon: '●',
    keywords: ['toast', 'alert', 'message'],
    create: () => ({ kind: 'action', payload: { type: 'show-message', message: '' } }),
  },
  {
    id: 'set-component-value',
    category: 'UI',
    label: 'Set Component Value',
    description: 'Prefill or update a component value',
    icon: '=',
    keywords: ['input', 'value', 'bind', 'prefill'],
    create: () => ({ kind: 'action', payload: { type: 'set-component-value', targetNodeId: '', value: '' } }),
  },
  {
    id: 'add-local-list-item',
    category: 'UI',
    label: 'Add Local List Item',
    description: 'Add a session-only item to a static ListView',
    icon: '+',
    keywords: ['listview', 'list', 'item', 'append', 'prepend', 'temporary', 'local'],
    create: () => ({
      kind: 'action',
      payload: { type: 'add-local-list-item', targetNodeId: '', placement: 'append', values: {} },
    }),
  },
  {
    id: 'navigate',
    category: 'UI',
    label: 'Navigate',
    description: 'Open another screen',
    icon: '➜',
    keywords: ['screen', 'page', 'route'],
    create: () => ({ kind: 'action', payload: { type: 'navigate', targetScreenId: '' } }),
  },
  {
    id: 'database',
    category: 'Database',
    label: 'Database',
    description: 'Read records from a collection',
    icon: '◉',
    keywords: ['get', 'query', 'records', 'select'],
    create: () => ({ kind: 'action', payload: { type: 'get-records', collectionId: '' } }),
  },
  {
    id: 'load-chart-data',
    category: 'Database',
    label: 'Load Chart Data',
    description: 'Load collection records into a Chart component',
    icon: '▥',
    keywords: ['chart', 'collection', 'records', 'visualize', 'load'],
    create: () => ({
      kind: 'action',
      payload: {
        type: 'load-chart-data',
        targetNodeId: '',
        collectionId: '',
        categoryFieldId: '',
        series: [],
      },
    }),
  },
  {
    id: 'load-list-items',
    category: 'Database',
    label: 'Load List Items',
    description: 'Load collection records into a ListView',
    icon: '☷',
    keywords: ['list', 'listview', 'collection', 'records', 'load', 'query'],
    create: () => ({
      kind: 'action',
      payload: {
        type: 'load-list-items',
        targetNodeId: '',
        collectionId: '',
        fields: [],
      },
    }),
  },
  {
    id: 'insert-db',
    category: 'Database',
    label: 'Insert to DB',
    description: 'Create a record in a collection',
    icon: '+',
    keywords: ['create', 'record', 'database'],
    create: () => ({ kind: 'action', payload: { type: 'insert-record', collectionId: '', values: {} } }),
  },
  {
    id: 'get-record',
    category: 'Database',
    label: 'Get Record',
    description: 'Read one record by its ID',
    icon: '⌕',
    keywords: ['get', 'read', 'record', 'database', 'edit'],
    create: () => ({ kind: 'action', payload: { type: 'get-record', collectionId: '', recordId: '' } }),
  },
  {
    id: 'update-db',
    category: 'Database',
    label: 'Update in DB',
    description: 'Update an existing record',
    icon: '↺',
    keywords: ['edit', 'record', 'database'],
    create: () => ({ kind: 'action', payload: { type: 'update-record', collectionId: '', recordId: '', values: {} } }),
  },
  {
    id: 'delete-db',
    category: 'Database',
    label: 'Delete from DB',
    description: 'Delete a record from a collection',
    icon: '×',
    keywords: ['remove', 'record', 'database'],
    create: () => ({ kind: 'action', payload: { type: 'delete-record', collectionId: '', recordId: '' } }),
  },
  {
    id: 'set-variable',
    category: 'Actions',
    label: 'Set Variable',
    description: 'Store a value for later logic steps',
    icon: 'V',
    keywords: ['variable', 'state', 'value'],
    create: () => ({ kind: 'action', payload: { type: 'set-variable', name: '', value: '' } }),
  },
  {
    id: 'set-theme',
    category: 'UI',
    label: 'Set Theme',
    description: 'Set or toggle the running app theme',
    icon: '◐',
    keywords: ['theme', 'dark', 'light', 'system', 'appearance', 'toggle'],
    create: () => ({ kind: 'action', payload: { type: 'set-theme', theme: 'toggle' } }),
  },
  {
    id: 'send-email',
    category: 'Actions',
    label: 'Send Email',
    description: 'Send an email through the Novy runtime',
    icon: '✉',
    keywords: ['email', 'message', 'notification'],
    create: () => ({ kind: 'action', payload: { type: 'send-email', to: '', subject: '', body: '' } }),
  },
  {
    id: 'document-load', category: 'RAG Nodes', label: 'Document Loader', icon: 'D',
    description: 'Load text, URL, file, or collection documents', keywords: ['document', 'load', 'url', 'file'],
    create: () => ({ kind: 'action', payload: { type: 'document-load', source: 'inline', sourceReference: '', documentId: '', title: '', text: '', metadata: {} } }),
  },
  {
    id: 'document-upload', category: 'RAG Nodes', label: 'Document Upload', icon: 'U',
    description: 'Upload and extract a runtime document', keywords: ['document', 'upload', 'file'],
    create: () => ({ kind: 'action', payload: { type: 'document-upload', mediaReference: '' } }),
  },
  {
    id: 'text-split', category: 'RAG Nodes', label: 'Text Splitter', icon: 'S',
    description: 'Split documents into overlapping chunks', keywords: ['chunk', 'split', 'token', 'recursive'],
    create: () => ({ kind: 'action', payload: { type: 'text-split', strategy: 'recursive-character', chunkSize: 700, chunkOverlap: 100, separators: ['\n\n', '\n', '. ', ' '] } }),
  },
  {
    id: 'embedding-generate', category: 'RAG Nodes', label: 'Embedding Model', icon: 'E',
    description: 'Convert chunks into embedding references', keywords: ['embedding', 'model', 'vector'],
    create: () => ({ kind: 'action', payload: { type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 } }),
  },
  {
    id: 'vector-store', category: 'RAG Nodes', label: 'Vector Store', icon: 'V',
    description: 'Upsert, delete, or expose retrieval as an Agent tool', keywords: ['vector', 'store', 'upsert', 'retrieve', 'tool'],
    create: () => ({ kind: 'action', payload: { type: 'vector-store', operation: 'upsert', connectionProfileId: '', indexName: '', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 } }),
  },
  {
    id: 'chat-input', category: 'RAG Nodes', label: 'Chat Input', icon: 'Q',
    description: 'Read a question from a component', keywords: ['chat', 'question', 'input'],
    create: () => ({ kind: 'action', payload: { type: 'chat-input', componentId: '', staticQuestion: '' } }),
  },
  {
    id: 'rerank', category: 'RAG Nodes', label: 'Reranker', icon: '↕',
    description: 'Reorder retrieved chunks by relevance', keywords: ['rerank', 'relevance', 'score'],
    create: () => ({ kind: 'action', payload: { type: 'rerank', connectionProfileId: '', model: '', topN: 5, minimumScore: 0 } }),
  },
  {
    id: 'prompt-template', category: 'RAG Nodes', label: 'Prompt Template', icon: 'P',
    description: 'Combine question and retrieved context', keywords: ['prompt', 'template', 'context'],
    create: () => ({ kind: 'action', payload: { type: 'prompt-template', template: 'Answer the question using only the supplied context.\n\nContext:\n{context}\n\nQuestion:\n{question}', contextSeparator: '\n\n---\n\n', emptyContextBehavior: 'return-empty' } }),
  },
  {
    id: 'chat-model', category: 'RAG Nodes', label: 'Chat Model', icon: 'M',
    description: 'Attach a provider-neutral chat model to an Agent', keywords: ['chat', 'model', 'llm', 'agent'],
    create: () => ({ kind: 'action', payload: { type: 'chat-model', connectionProfileId: '', model: '', temperature: 0.2, maxTokens: 800 } }),
  },
  {
    id: 'ai-agent', category: 'RAG Nodes', label: 'AI Agent', icon: 'A',
    description: 'Use a model, memory, and retrieval tools to answer', keywords: ['agent', 'tool', 'chat', 'rag'],
    create: () => ({ kind: 'action', payload: { type: 'ai-agent', instructions: 'Answer using the attached knowledge tools and cite relevant sources.', maxIterations: 4, returnIntermediateSteps: false } }),
  },
  {
    id: 'chat-output', category: 'RAG Nodes', label: 'Chat Output', icon: 'A',
    description: 'Render an answer and citations', keywords: ['chat', 'answer', 'output', 'citation'],
    create: () => ({ kind: 'action', payload: { type: 'chat-output', targetNodeId: '' } }),
  },
  {
    id: 'chat-message', category: 'RAG Nodes', label: 'Chat Message', icon: 'C',
    description: 'Append a user or assistant message to a Chat widget', keywords: ['chat', 'message', 'bubble', 'transcript'],
    create: () => ({ kind: 'action', payload: { type: 'chat-message', targetNodeId: '', role: 'assistant', text: '' } }),
  },
  {
    id: 'memory', category: 'RAG Nodes', label: 'Conversation Memory', icon: 'H',
    description: 'Load, append, or clear chat history', keywords: ['memory', 'history', 'conversation'],
    create: () => ({ kind: 'action', payload: { type: 'memory', operation: 'load', connectionProfileId: '', scope: 'session', windowSize: 10 } }),
  },
  {
    id: 'cv-liveness',
    category: 'Computer Vision',
    label: 'CV Liveness',
    description: 'Check whether a captured image is live',
    icon: 'L',
    keywords: ['vision', 'liveness', 'camera', 'biometric'],
    create: () => ({ kind: 'action', payload: { type: 'cv-liveness', mediaReference: '' } }),
  },
  {
    id: 'cv-enroll',
    category: 'Computer Vision',
    label: 'CV Enroll',
    description: 'Enroll a biometric credential',
    icon: 'E',
    keywords: ['vision', 'enroll', 'face', 'biometric'],
    create: () => ({ kind: 'action', payload: { type: 'cv-enroll', mediaReference: '', userId: '', consent: false } }),
  },
  {
    id: 'cv-verify',
    category: 'Computer Vision',
    label: 'CV Verify',
    description: 'Verify a captured face',
    icon: 'V',
    keywords: ['vision', 'verify', 'face', 'biometric'],
    create: () => ({ kind: 'action', payload: { type: 'cv-verify', mediaReference: '' } }),
  },
  {
    id: 'refresh-collection',
    category: 'Database',
    label: 'Refresh Collection',
    description: 'Refetch a collection after an action succeeds',
    icon: '↻',
    keywords: ['refresh', 'refetch', 'reload', 'query'],
    create: () => ({ kind: 'action', payload: { type: 'refresh-collection', collectionId: '' } }),
  },
];

export function logicNodeDefinition(id: string): LogicNodeDefinition | undefined {
  return LOGIC_NODE_DEFINITIONS.find((definition) => definition.id === id);
}

export function serializeLogicLibraryNode(node: LogicLibraryNode): string {
  return `node:${JSON.stringify(node)}`;
}

export function parseLogicLibraryNode(value: string): LogicLibraryNode | null {
  if (!value.startsWith('node:')) return null;
  try {
    const parsed: unknown = JSON.parse(value.slice(5));
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) return null;
    const kind = (parsed as { kind?: unknown }).kind;
    if (kind === 'condition') return { kind: 'condition' };
    if (kind === 'trigger' && 'event' in parsed) return parsed as LogicLibraryNode;
    if (kind === 'action' && 'payload' in parsed) return parsed as LogicLibraryNode;
    return null;
  } catch {
    return null;
  }
}
