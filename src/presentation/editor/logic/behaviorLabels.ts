import type { ComponentNode } from '@domain/entities/componentNode';
import type { TriggerEvent } from '@domain/entities/logic';
import { nodeDisplayLabel } from '../workspace/nodeLabels';

/** Human labels for trigger events, shared by tabs, inspector, and reducer naming. */
export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  click: 'On click',
  change: 'On change',
  load: 'On load',
};

/**
 * Persisted display name for a behavior, e.g. "On click — Click me".
 * Frozen at creation: renaming the component later keeps the historical
 * name, matching how undo history reads naturally.
 */
export function behaviorDisplayName(event: TriggerEvent, target: ComponentNode): string {
  return `${TRIGGER_EVENT_LABELS[event]} — ${nodeDisplayLabel(target)}`;
}
