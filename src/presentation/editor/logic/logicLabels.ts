import type { ActionPayload, Behavior, LogicNode } from '@domain/entities/logic';
import { TRIGGER_EVENT_LABELS } from './behaviorLabels';

/** Short card title of a graph node ("On click", "Change text", …). */
export function logicNodeTitle(node: LogicNode): string {
  if (node.kind === 'trigger') {
    return TRIGGER_EVENT_LABELS[node.event];
  }
  return node.kind === 'condition' ? 'If / Else' : ACTION_TYPE_LABELS[node.payload.type];
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
  'insert-record': 'Insert to DB',
  'update-record': 'Update in DB',
  'delete-record': 'Delete from DB',
  'send-email': 'Send email',
  'refresh-collection': 'Refresh collection',
};
