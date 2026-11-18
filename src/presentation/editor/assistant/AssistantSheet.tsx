import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { AssistantImageAttachment, AssistantProviderId } from '@domain/entities/assistant';
import { useDialogFocus } from '@presentation/hooks/useDialogFocus';
import type { AssistantConversation, AssistantMessage } from './useAssistantConversation';

interface AssistantSheetProps {
  conversation: AssistantConversation;
  onClose: () => void;
}

export function AssistantSheet({ conversation, onClose }: AssistantSheetProps) {
  const {
    messages, mode, isWorking, isAvailable, providers, selectedProviderId,
    setSelectedProviderId, selectedModelId, setSelectedModelId,
    setMode, send, accept, reject,
  } = conversation;
  const visibleMessages = messages.filter((message) => message.mode === mode);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<AssistantImageAttachment | null>(null);
  const [imageError, setImageError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useDialogFocus({ containerRef: panelRef, initialFocusRef: inputRef, onClose });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleMessages, isWorking]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!draft.trim() || isWorking) return;
    const message = draft;
    setDraft('');
    const images = image ? [image] : [];
    setImage(null);
    setImageError('');
    void send(message, images);
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
    if (!allowed.includes(file.type as typeof allowed[number])) {
      setImageError('Choose a PNG, JPEG, GIF, or WebP image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImageError('Images must not exceed 3 MiB.');
      return;
    }
    let dataUrl: string;
    try {
      dataUrl = await readAsDataUrl(file);
    } catch {
      setImageError('The image could not be read.');
      return;
    }
    const encoded = dataUrl.split(',', 2)[1];
    if (!encoded) {
      setImageError('The image could not be read.');
      return;
    }
    setImage({
      name: file.name.slice(0, 120),
      mimeType: file.type as AssistantImageAttachment['mimeType'],
      contentBase64: encoded,
    });
    setImageError('');
  }

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
  const selectedModel = selectedProvider?.models.find((model) => model.id === selectedModelId);
  const selectedCapability = selectedModel ?? selectedProvider;
  const imageUnsupported = Boolean(image && selectedCapability && !selectedCapability.imageInput);
  const providerUnavailable = Boolean(selectedCapability && !selectedCapability.available);

  return (
    <div className="fixed inset-0 z-50" data-testid="assistant-overlay">
      <div aria-hidden="true" className="absolute inset-0 bg-ink/30" data-testid="assistant-scrim" onClick={onClose} />
      <aside
        aria-labelledby="assistant-title"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-hairline bg-surface shadow-xl"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-ink" id="assistant-title">AI assistant</h2>
            <p className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {isAvailable && selectedProvider
                ? `${selectedModel?.name ?? providerLabel(selectedProvider.id)} · ${selectedCapability?.location === 'local' ? 'local' : 'remote processing'}`
                : isAvailable ? 'Loading assistant providers…' : 'Backend connection required'}
            </p>
          </div>
          <button aria-label="Close assistant" className="rounded-tile px-2 py-1 text-lg leading-none text-ink-muted transition-colors hover:bg-canvas hover:text-ink" onClick={onClose} type="button">×</button>
        </header>

        <div aria-label="Assistant mode" className="grid grid-cols-2 gap-1 border-b border-hairline bg-canvas p-1" role="tablist">
          <button
            aria-selected={mode === 'build'}
            className={`rounded-tile px-3 py-2 text-sm font-medium ${mode === 'build' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            onClick={() => setMode('build')}
            role="tab"
            type="button"
          >
            Build app
          </button>
          <button
            aria-selected={mode === 'help'}
            className={`rounded-tile px-3 py-2 text-sm font-medium ${mode === 'help' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            onClick={() => setMode('help')}
            role="tab"
            type="button"
          >
            Ask Novy
          </button>
        </div>

        <div aria-busy={isWorking} aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" data-testid="assistant-log" ref={logRef} role="log">
          {visibleMessages.length === 0 ? (
            <div className="rounded-panel border border-dashed border-hairline bg-canvas p-4 text-sm text-ink-muted">
              <p className="font-medium text-ink">{mode === 'build' ? 'Describe the app you want' : 'Ask about Novy'}</p>
              <p className="mt-1">
                {mode === 'build'
                  ? 'Describe what to build or change. Novy checks and repairs every responsive web app before showing the preview.'
                  : 'Ask how a documented Novy feature, workflow, or configuration works.'}
              </p>
              <p className="mt-2">
                {mode === 'build'
                  ? 'Nothing is saved until you choose Apply app.'
                  : 'Answers are limited to indexed Novy documentation and include their sources.'}
              </p>
            </div>
          ) : visibleMessages.map((message) => (
            <MessageRow key={message.id} message={message} isWorking={isWorking} onAccept={accept} onReject={reject} />
          ))}
          {isWorking ? <p className="text-sm text-ink-muted" role="status">{mode === 'build' ? 'Building, checking mobile, tablet, and desktop, and repairing errors…' : 'Searching indexed documentation…'}</p> : null}
        </div>

        <form aria-label="Assistant message form" className="border-t border-hairline p-3" onSubmit={handleSubmit}>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-xs font-medium text-ink-muted" htmlFor="assistant-provider">Provider</label>
            <select
              aria-label="Assistant provider"
              className="min-w-0 flex-1 rounded-tile border border-hairline bg-surface px-2 py-1.5 text-xs text-ink"
              disabled={isWorking || providers.length === 0}
              id="assistant-provider"
              onChange={(event) => setSelectedProviderId(event.target.value as AssistantProviderId)}
              value={selectedProviderId}
            >
              {providers.length === 0 ? <option value="opencode">Loading providers…</option> : null}
              {providers.map((provider) => (
                <option disabled={!provider.available} key={provider.id} value={provider.id}>
                  {providerLabel(provider.id)} · {provider.location === 'local' ? 'Local' : 'Remote'}
                  {provider.costWarning ? ' · May cost' : ''}{!provider.available ? ' · Unavailable' : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedProvider && selectedProvider.models.length > 0 ? (
            <div className="mb-2 flex items-center gap-2">
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
          {selectedCapability?.costWarning ? (
            <p className="mb-2 text-xs text-amber-700">
              {selectedModel?.usageNote || 'This remote provider may incur usage charges.'}
            </p>
          ) : null}
          {image ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-tile bg-canvas px-2.5 py-2 text-xs">
              <span className="truncate text-ink">Image: {image.name}</span>
              <button className="font-medium text-ink-muted hover:text-ink" onClick={() => setImage(null)} type="button">Remove</button>
            </div>
          ) : null}
          {imageError ? <p className="mb-2 text-xs text-red-600" role="alert">{imageError}</p> : null}
          {imageUnsupported ? <p className="mb-2 text-xs text-red-600" role="alert">The selected model does not support images.</p> : null}
          <label className="sr-only" htmlFor="assistant-message">Message</label>
          <div className="flex items-center gap-2">
            <label className="flex h-10 cursor-pointer items-center rounded-tile border border-hairline px-3 text-sm font-medium text-ink hover:bg-canvas">
              <span aria-hidden="true">＋</span><span className="sr-only">Attach image</span>
              <input
                accept="image/png,image/jpeg,image/gif,image/webp"
                aria-label="Attach image"
                className="sr-only"
                disabled={isWorking}
                onChange={(event) => void handleImage(event)}
                type="file"
              />
            </label>
            <input
              aria-label="Message"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-tile border border-hairline bg-surface px-3 text-sm text-ink outline-none focus:border-brand-600 disabled:bg-canvas"
              disabled={isWorking}
              id="assistant-message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={mode === 'build' ? 'Describe or refine an app…' : 'Ask a Novy question…'}
              ref={inputRef}
              value={draft}
            />
            <button className="h-10 shrink-0 rounded-tile bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50" disabled={draft.trim().length === 0 || isWorking || imageUnsupported || providerUnavailable} type="submit">Send</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function providerLabel(provider: AssistantProviderId): string {
  if (provider === 'opencode') return 'OpenCode';
  if (provider === 'openrouter') return 'OpenRouter';
  return 'Ollama';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Could not read image.')));
    reader.readAsDataURL(file);
  });
}

function MessageRow({
  message,
  isWorking,
  onAccept,
  onReject,
}: {
  message: AssistantMessage;
  isWorking: boolean;
  onAccept: (messageId: string) => Promise<void>;
  onReject: (messageId: string) => void;
}) {
  if (message.role === 'user') {
    return <div className="flex justify-end"><p className="max-w-[85%] rounded-panel rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">{message.text}</p></div>;
  }
  const proposal = message.proposal;
  const help = message.help;
  return (
    <div className="max-w-[98%] space-y-2">
      <p className="rounded-panel rounded-bl-sm bg-canvas px-3 py-2 text-sm text-ink">{message.text}</p>
      {help?.sources.length ? (
        <section aria-label="Answer sources" className="rounded-panel border border-hairline bg-surface p-3 text-xs">
          <h3 className="font-semibold text-ink">Sources</h3>
          <ul className="mt-2 space-y-1 text-ink-muted">
            {help.sources.map((source) => (
              <li key={`${source.reference}-${source.uri}`}>
                <span className="font-medium text-ink">[{source.reference}] {source.title}</span>
                {source.heading ? ` · ${source.heading}` : ''}
                {source.page ? ` · page ${source.page}` : ''}
                <span className="block break-all">{source.uri}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {proposal ? (
        <section aria-label="App proposal preview" className="rounded-panel border border-hairline bg-surface p-3" data-testid="assistant-proposal">
          <h3 className="text-sm font-semibold text-ink">App preview</h3>
          {proposal.verification ? (
            <section
              aria-label="Build verification"
              className={`mt-2 rounded-tile border p-2.5 text-xs ${proposal.verification.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950'}`}
            >
              <p className="font-semibold">
                {proposal.verification.passed ? 'Built, checked, and ready to review' : 'Build checks found errors'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Responsive viewport checks">
                {proposal.verification.viewports.map((viewport) => (
                  <span className="rounded-full bg-white/80 px-2 py-1 font-medium" key={viewport.id}>
                    {viewport.id[0]!.toUpperCase() + viewport.id.slice(1)} {viewport.width}×{viewport.height} · {viewport.passed ? 'Passed' : 'Failed'}
                  </span>
                ))}
              </div>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {proposal.verification.stages.map((stage) => (
                  <li key={stage.id}>{stage.passed ? '✓' : '×'} {stage.label}</li>
                ))}
              </ul>
              {proposal.verification.repairAttempts > 0 ? (
                <p className="mt-2">Novy repaired the draft {proposal.verification.repairAttempts} {proposal.verification.repairAttempts === 1 ? 'time' : 'times'} before presenting it.</p>
              ) : null}
              {proposal.verification.issues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {proposal.verification.issues.map((issue) => <li key={`${issue.code}-${issue.screenId ?? ''}-${issue.viewport ?? ''}`}>{issue.message}</li>)}
                </ul>
              ) : null}
            </section>
          ) : null}
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><dt className="text-ink-muted">Screens</dt><dd className="font-semibold text-ink">{proposal.blueprint.screens.length}</dd></div>
            <div><dt className="text-ink-muted">Components</dt><dd className="font-semibold text-ink">{proposal.blueprint.screens.reduce((total, screen) => total + screen.components.length, 0)}</dd></div>
            <div><dt className="text-ink-muted">Collections</dt><dd className="font-semibold text-ink">{proposal.blueprint.collections.length}</dd></div>
          </dl>
          <div className="mt-3 space-y-2">
            {proposal.blueprint.screens.map((screen) => (
              <div className="rounded-tile bg-canvas px-2.5 py-2 text-xs" key={screen.key}>
                <p className="font-medium text-ink">{screen.name} <span className="font-normal text-ink-muted">{screen.path}</span></p>
                <p className="mt-0.5 text-ink-muted">{screen.components.length} components · {screen.workflows.length} workflows</p>
              </div>
            ))}
          </div>
          {proposal.blueprint.collections.length > 0 ? (
            <p className="mt-3 text-xs text-ink-muted">Data: {proposal.blueprint.collections.map((collection) => `${collection.name} (${collection.fields.length} fields)`).join(', ')}</p>
          ) : null}
          {message.status === 'pending' ? (
            <div className="mt-3 flex gap-2">
              <button className="rounded-tile bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50" disabled={isWorking || proposal.verification?.passed === false} onClick={() => void onAccept(message.id)} type="button">Apply app</button>
              <button className="rounded-tile border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas disabled:opacity-50" disabled={isWorking} onClick={() => onReject(message.id)} type="button">Reject</button>
            </div>
          ) : null}
          {message.status === 'applied' ? <p className="mt-3 text-xs font-medium text-brand-700">Applied and saved to the project.</p> : null}
          {message.status === 'rejected' ? <p className="mt-3 text-xs text-ink-muted">Rejected. The project was not changed.</p> : null}
          {message.status === 'superseded' ? <p className="mt-3 text-xs text-ink-muted">Superseded by a newer refinement.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
