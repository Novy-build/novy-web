import type { ActionPayload, TriggerEvent } from '@domain/entities/logic';

export type LogicNodeCategory = 'Triggers' | 'Flow' | 'UI' | 'Database';

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
];

export function logicNodeDefinition(id: string): LogicNodeDefinition | undefined {
  return LOGIC_NODE_DEFINITIONS.find((definition) => definition.id === id);
}
