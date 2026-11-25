import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { AssistantProviderCapability, AssistantProviderId } from '@domain/entities/assistant';
import { assistantProviderLabel } from './assistantProviderLabel';
import type { AssistantCapabilitiesStatus } from './useAssistantConversation';

interface AssistantModelSettingsPopoverProps {
  isWorking: boolean;
  onClose: () => void;
  providers: AssistantProviderCapability[];
  capabilitiesStatus: AssistantCapabilitiesStatus;
  capabilitiesError: string | null;
  onReloadCapabilities: () => void;
  selectedModelId: string | null;
  selectedProviderId: AssistantProviderId;
  setSelectedModelId: (modelId: string) => void;
  setSelectedProviderId: (provider: AssistantProviderId) => void;
}

/** Compact provider/model popover opened from the composer shield control or mode menu. */
export function AssistantModelSettingsPopover({
  isWorking,
  onClose,
  providers,
  capabilitiesStatus,
  capabilitiesError,
  onReloadCapabilities,
  selectedModelId,
  selectedProviderId,
  setSelectedModelId,
  setSelectedProviderId,
}: AssistantModelSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    popoverRef.current?.querySelector<HTMLSelectElement>('select')?.focus();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (!target || popoverRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-assistant-settings-trigger]')) return;
      onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [onClose]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  }

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
  const isLoadingCapabilities = capabilitiesStatus === 'loading';
  const hasCapabilityError = capabilitiesStatus === 'error';

  return (
    <div
      aria-label="Model settings"
      className="absolute bottom-full left-0 z-20 mb-2 w-full rounded-tile border border-hairline bg-surface p-3 shadow-lg"
      id="assistant-model-settings"
      onKeyDown={handleKeyDown}
      ref={popoverRef}
      role="dialog"
    >
      <p className="mb-2 text-xs font-semibold text-ink">Model settings</p>
      <div className="mb-2 flex items-center gap-2">
        <label className="text-xs font-medium text-ink-muted" htmlFor="assistant-provider">Provider</label>
        <select
          aria-label="Assistant provider"
          className="min-w-0 flex-1 rounded-tile border border-hairline bg-surface px-2 py-1.5 text-xs text-ink"
          disabled={isWorking || isLoadingCapabilities || providers.length === 0}
          id="assistant-provider"
          onChange={(event) => setSelectedProviderId(event.target.value as AssistantProviderId)}
          value={selectedProviderId}
        >
          {isLoadingCapabilities ? <option value="">Loading providers…</option> : null}
          {!isLoadingCapabilities && providers.length === 0 ? <option value="">No providers available</option> : null}
          {providers.map((provider) => (
            <option disabled={!provider.available} key={provider.id} value={provider.id}>
              {assistantProviderLabel(provider.id)} · {provider.location === 'local' ? 'Local' : 'Remote'}
              {provider.costWarning ? ' · May cost' : ''}{!provider.available ? ' · Unavailable' : ''}
            </option>
          ))}
        </select>
      </div>
      {hasCapabilityError ? (
        <div className="mb-2 rounded-tile border border-hairline bg-canvas p-2 text-xs text-ink-muted" role="alert">
          <p>{capabilitiesError ?? 'Assistant providers could not be loaded.'}</p>
          <button
            className="mt-1 rounded-tile border border-hairline bg-surface px-2 py-1 font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
            disabled={isLoadingCapabilities}
            onClick={onReloadCapabilities}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}
      {selectedProvider && selectedProvider.models.length > 0 ? (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-ink-muted" htmlFor="assistant-model">Model</label>
          <select
            aria-label="Assistant model"
            className="min-w-0 flex-1 rounded-tile border border-hairline bg-surface px-2 py-1.5 text-xs text-ink"
            disabled={isWorking}
            id="assistant-model"
            onChange={(event) => setSelectedModelId(event.target.value)}
            value={selectedModelId ?? selectedProvider.defaultModelId ?? ''}
          >
            {selectedProvider.models.map((model) => (
              <option disabled={!model.available} key={model.id} value={model.id}>
                {model.name} · {model.location === 'local' ? 'Local' : 'Remote'}
                {model.costWarning ? ' · Uses account' : ''}
                {!model.available ? ' · Unavailable' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
