import type { ActionPayload, Behavior, LogicNode } from '@domain/entities/logic';
import { TRIGGER_EVENT_LABELS } from './behaviorLabels';

/** Short card title of a graph node ("On click", "Change text", …). */
export function logicNodeTitle(node: LogicNode): string {
  if (node.kind === 'trigger') {
    return TRIGGER_EVENT_LABELS[node.event];
  }
  if (node.kind === 'condition') return 'If / Else';
  const currentItem = node.inputMappings?.['$recordId'];
  const isCurrentItem = currentItem?.source === 'list-item' && currentItem.fieldId === '$id';
  if (isCurrentItem && node.payload.type === 'update-record') return 'Update current item';
  if (isCurrentItem && node.payload.type === 'delete-record') return 'Delete current item';
  if (isCurrentItem && node.payload.type === 'navigate') return 'Open current item';
  return ACTION_TYPE_LABELS[node.payload.type];
}

/** Persisted tab name of a behavior, e.g. "On click — Click me". */
export function behaviorTabLabel(behavior: Behavior): string {
  return behavior.name;
}

const ACTION_TYPE_LABELS: Record<ActionPayload['type'], string> = {
  'change-text': 'Change text',
  'show-message': 'Show message',
  navigate: 'Navigate',
  'get-records': 'Database',
  'get-record': 'Get record',
  'insert-record': 'Insert to DB',
  'update-record': 'Update in DB',
  'delete-record': 'Delete from DB',
  'send-email': 'Send email',
  'refresh-collection': 'Refresh collection',
  'set-variable': 'Set variable',
  'set-theme': 'Set theme',
  'set-component-value': 'Set component value',
  'add-local-list-item': 'Add local list item',
  'document-load': 'Document loader',
  'document-upload': 'Document upload',
  'text-split': 'Text splitter',
  'embedding-generate': 'Embedding model',
  'vector-upsert': 'Vector store upsert',
  'vector-delete': 'Vector store delete',
  'chat-input': 'Chat input',
  'chat-message': 'Chat message',
  'query-embedding': 'Query embedding',
  'vector-retrieve': 'Retriever',
  rerank: 'Reranker',
  'prompt-template': 'Prompt template',
  'llm-generate': 'LLM model',
  'chat-output': 'Chat output',
  memory: 'Conversation memory',
  'vector-store': 'Vector store',
  'chat-model': 'Chat model',
  'ai-agent': 'AI agent',
  'cv-liveness': 'CV liveness',
  'cv-enroll': 'CV enroll',
  'cv-verify': 'CV verify',
};
