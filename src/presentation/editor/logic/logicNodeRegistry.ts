import type { ActionPayload, TriggerEvent } from '@domain/entities/logic';

export type LogicNodeCategory = 'Triggers' | 'Flow' | 'UI' | 'Database' | 'Actions' | 'AI' | 'Vision';

export type LogicLibraryNode =
  | { kind: 'trigger'; event: TriggerEvent }
  | { kind: 'condition' }
  | { kind: 'action'; payload: ActionPayload };

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
    id: 'insert-db',
    category: 'Database',
    label: 'Insert to DB',
    description: 'Create a record in a collection',
    icon: '+',
    keywords: ['create', 'record', 'database'],
    create: () => ({ kind: 'action', payload: { type: 'insert-record', collectionId: '', values: {} } }),
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
    id: 'send-email',
    category: 'Actions',
    label: 'Send Email',
    description: 'Send an email through the Novy runtime',
    icon: '✉',
    keywords: ['email', 'message', 'notification'],
    create: () => ({ kind: 'action', payload: { type: 'send-email', to: '', subject: '', body: '' } }),
  },
  {
    id: 'rag-index',
    category: 'AI',
    label: 'RAG Index',
    description: 'Index a document for retrieval',
    icon: 'I',
    keywords: ['rag', 'index', 'embedding', 'knowledge'],
    create: () => ({ kind: 'action', payload: { type: 'rag-index', documentId: '', title: '', content: '' } }),
  },
  {
    id: 'rag-query',
    category: 'AI',
    label: 'RAG Query',
    description: 'Answer a question from indexed knowledge',
    icon: '?',
    keywords: ['rag', 'query', 'answer', 'search'],
    create: () => ({ kind: 'action', payload: { type: 'rag-query', query: '', topK: 5 } }),
  },
  {
    id: 'cv-liveness',
    category: 'Vision',
    label: 'CV Liveness',
    description: 'Check whether a captured image is live',
    icon: 'L',
    keywords: ['vision', 'liveness', 'camera', 'biometric'],
    create: () => ({ kind: 'action', payload: { type: 'cv-liveness', mediaReference: '' } }),
  },
  {
    id: 'cv-enroll',
    category: 'Vision',
    label: 'CV Enroll',
    description: 'Enroll a biometric credential',
    icon: 'E',
    keywords: ['vision', 'enroll', 'face', 'biometric'],
    create: () => ({ kind: 'action', payload: { type: 'cv-enroll', mediaReference: '', userId: '', consent: false } }),
  },
  {
    id: 'cv-verify',
    category: 'Vision',
    label: 'CV Verify',
    description: 'Verify a captured face',
    icon: 'V',
    keywords: ['vision', 'verify', 'face', 'biometric'],
    create: () => ({ kind: 'action', payload: { type: 'cv-verify', mediaReference: '' } }),
  },
  {
    id: 'rag-remove',
    category: 'AI',
    label: 'RAG Remove',
    description: 'Remove an indexed document',
    icon: '-',
    keywords: ['rag', 'remove', 'delete', 'index'],
    create: () => ({ kind: 'action', payload: { type: 'rag-remove', documentId: '' } }),
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
