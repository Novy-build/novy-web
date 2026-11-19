import type { AssistantConversation } from './useAssistantConversation';

interface AssistantActivityIndicatorProps {
  hasPendingDraft: boolean;
  operation: AssistantConversation['operation'];
}

/** Compact live feedback for the current assistant operation. */
export function AssistantActivityIndicator({ hasPendingDraft, operation }: AssistantActivityIndicatorProps) {
  if (operation === null || operation === 'apply') {
    return null;
  }
  const label = operation === 'help'
    ? 'Searching docs…'
    : hasPendingDraft ? 'Refining…' : 'Thinking…';
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-hairline border-t-brand-600"
      />
      <span>{label}</span>
    </p>
  );
}
