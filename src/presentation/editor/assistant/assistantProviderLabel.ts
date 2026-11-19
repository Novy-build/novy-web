import type { AssistantProviderId } from '@domain/entities/assistant';

export function assistantProviderLabel(provider: AssistantProviderId): string {
  if (provider === 'opencode') return 'OpenCode';
  if (provider === 'openrouter') return 'OpenRouter';
  return 'Ollama';
}
