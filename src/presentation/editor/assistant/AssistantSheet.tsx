import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Bot, ChevronDown, Image as ImageIcon, MessageCircle, Plus, Shield, X } from 'lucide-react';
import type { AssistantImageAttachment } from '@domain/entities/assistant';
import { useDialogFocus } from '@presentation/hooks/useDialogFocus';
import type { AssistantConversation, AssistantMessage, AssistantMode } from './useAssistantConversation';
import { AssistantActivityIndicator } from './AssistantActivityIndicator';
import { assistantProviderLabel } from './assistantProviderLabel';
import { AssistantModeMenu } from './AssistantModeMenu';
import { AssistantModelSettingsPopover } from './AssistantModelSettingsPopover';
import { AssistantProposalCard } from './AssistantProposalCard';
import { AssistantProposalActions } from './AssistantProposalActions';
import { assistantPreviewCollections, assistantProposalTitle } from './assistantProposalPreview';
import { PreviewOverlay } from '../workspace/PreviewOverlay';

interface AssistantSheetProps {
  conversation: AssistantConversation;
  onClose: () => void;
  /** Field help request: opens help mode with a prepared documentation question. */
  helpRequest?: { query: string; token: number } | null;
}

export function AssistantSheet({ conversation, onClose, helpRequest }: AssistantSheetProps) {
  const {
    messages, mode, isWorking, operation, isAvailable, providers, selectedProviderId,
    setSelectedProviderId, selectedModelId, setSelectedModelId,
    setMode, send, accept, reject,
  } = conversation;
  const visibleMessages = useMemo(() => messages.filter((message) => message.mode === mode), [messages, mode]);
  const pendingMessage = [...visibleMessages].reverse().find((message) => message.status === 'pending' && message.proposal);
  const [previewMessageId, setPreviewMessageId] = useState<string | null>(null);
  const previewMessage = messages.find((message) => message.id === previewMessageId);
  const previewProposal = previewMessage?.proposal;
  const previewCollections = useMemo(() => previewProposal ? assistantPreviewCollections(previewProposal) : [], [previewProposal]);
  const [isRefining, setIsRefining] = useState(false);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<AssistantImageAttachment | null>(null);
  const [imageError, setImageError] = useState('');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appliedHelpToken, setAppliedHelpToken] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const modeChipRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ containerRef: panelRef, initialFocusRef: focusTargetRef, onClose, enabled: !previewProposal });

  useEffect(() => {
    if (!helpRequest || appliedHelpToken === helpRequest.token) return;
    setAppliedHelpToken(helpRequest.token);
    setIsRefining(false);
    setDraft(helpRequest.query);
    setMode('help');
    inputRef.current?.focus();
  }, [appliedHelpToken, helpRequest, setMode]);

  useEffect(() => {
    if (isWorking) {
      setIsModeMenuOpen(false);
      setIsSettingsOpen(false);
    }
  }, [isWorking]);

  function closeModeMenu(): void {
    setIsModeMenuOpen(false);
  }

  function closeModeMenuAndFocusChip(): void {
    setIsModeMenuOpen(false);
    modeChipRef.current?.focus();
  }

  function selectMode(nextMode: AssistantMode): void {
    setMode(nextMode);
    closeModeMenuAndFocusChip();
  }

  function openModelSettings(): void {
    setIsModeMenuOpen(false);
    setIsSettingsOpen(true);
  }

  function closeModelSettings(): void {
    setIsSettingsOpen(false);
    settingsButtonRef.current?.focus();
  }

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const lastMessage = visibleMessages.at(-1);
    const draftCard = lastMessage?.proposal ? document.getElementById(`assistant-message-${lastMessage.id}`) : null;
    log.scrollTop = draftCard ? Math.max(0, draftCard.offsetTop - log.offsetTop) : log.scrollHeight;
  }, [visibleMessages, isWorking]);

  function submitDraft(): void {
    if (!draft.trim() || isWorking) return;
    const message = draft;
    setDraft('');
    setIsRefining(false);
    const images = image ? [image] : [];
    setImage(null);
    setImageError('');
    void send(message, images);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitDraft();
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitDraft();
    }
  }

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [draft]);

  function openPreview(messageId: string, opener: HTMLButtonElement): void {
    focusTargetRef.current = opener;
    setPreviewMessageId(messageId);
  }

  function refineDraft(): void {
    setIsRefining(true);
    inputRef.current?.focus();
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
        aria-modal={previewProposal ? undefined : true}
        aria-hidden={previewProposal ? true : undefined}
        inert={Boolean(previewProposal)}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-hairline bg-surface shadow-xl"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 py-3 [@media(max-height:500px)]:py-2">
          <div>
            <h2 className="text-base font-semibold text-ink" id="assistant-title">AI assistant</h2>
            <p className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {isAvailable && selectedProvider
                ? `${selectedModel?.name ?? assistantProviderLabel(selectedProvider.id)} · ${selectedCapability?.location === 'local' ? 'local' : 'remote processing'}`
                : isAvailable ? 'Loading assistant providers…' : 'Backend connection required'}
            </p>
          </div>
          <button aria-label="Close assistant" className="flex min-h-11 min-w-11 items-center justify-center rounded-tile text-lg leading-none text-ink-muted transition-colors hover:bg-canvas hover:text-ink" onClick={onClose} type="button">×</button>
        </header>

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
                  ? 'Nothing is saved until you choose Use this app.'
                  : 'Answers are limited to indexed Novy documentation and include their sources.'}
              </p>
            </div>
          ) : visibleMessages.map((message) => (
            <MessageRow key={message.id} message={message} onPreview={(opener) => openPreview(message.id, opener)} onContinue={onClose} />
          ))}
          <AssistantActivityIndicator hasPendingDraft={Boolean(pendingMessage)} operation={operation} />
        </div>

        {pendingMessage?.proposal ? (
          <AssistantProposalActions
            canApply={pendingMessage.proposal.verification?.passed !== false}
            hasExistingContent={conversation.hasExistingContent}
            isApplying={operation === 'apply'}
            isWorking={isWorking}
            key={pendingMessage.id}
            onAccept={() => accept(pendingMessage.id)}
            onDiscard={() => reject(pendingMessage.id)}
            onRefine={refineDraft}
          />
        ) : null}

        <form aria-label="Assistant message form" className="shrink-0 border-t border-hairline p-3" onSubmit={handleSubmit}>
          {selectedCapability?.costWarning ? (
            <p className="mb-2 text-xs text-amber-700">
              {selectedModel?.usageNote || 'This remote provider may incur usage charges.'}
            </p>
          ) : null}
          {isRefining && pendingMessage ? <p className="mb-2 text-xs text-ink-muted">Describe what you’d like to change. Your current draft stays until a new one is ready.</p> : null}
          <div className="relative rounded-panel border border-hairline bg-surface p-2 transition-colors focus-within:border-brand-600">
            {image ? (
              <div className="mb-2 flex items-center gap-2 rounded-tile bg-canvas px-2 py-1.5 text-xs">
                <ImageIcon aria-hidden="true" className="shrink-0 text-ink-muted" size={14} />
                <span className="min-w-0 flex-1 truncate text-ink">Image: {image.name}</span>
                <button
                  aria-label="Remove image"
                  className="rounded-tile p-0.5 text-ink-muted transition-colors hover:text-ink"
                  onClick={() => setImage(null)}
                  type="button"
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </div>
            ) : null}
            {imageError ? <p className="mb-2 text-xs text-red-600" role="alert">{imageError}</p> : null}
            {imageUnsupported ? <p className="mb-2 text-xs text-red-600" role="alert">The selected model does not support images.</p> : null}
            <label className="sr-only" htmlFor="assistant-message">Message</label>
            <textarea
              aria-label="Message"
              autoComplete="off"
              className="block max-h-[200px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:bg-transparent"
              disabled={isWorking}
              id="assistant-message"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleMessageKeyDown}
              placeholder={mode === 'help' ? 'Ask Novy…' : isRefining && pendingMessage ? 'What would you like to change?' : 'Chat with Novy'}
              ref={(element) => { inputRef.current = element; if (!focusTargetRef.current) focusTargetRef.current = element; }}
              rows={1}
              value={draft}
            />
            <div className="mt-1 flex items-center gap-1.5">
              <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-tile text-ink-muted transition-colors hover:bg-canvas hover:text-ink">
                <Plus aria-hidden="true" size={18} />
                <span className="sr-only">Attach image</span>
                <input
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  aria-label="Attach image"
                  className="sr-only"
                  disabled={isWorking}
                  onChange={(event) => void handleImage(event)}
                  type="file"
                />
              </label>
              <div className="relative shrink-0">
                <button
                  aria-controls={isModeMenuOpen ? 'assistant-mode-menu' : undefined}
                  aria-expanded={isModeMenuOpen}
                  aria-haspopup="menu"
                  className="flex h-8 items-center gap-1.5 rounded-tile px-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-50"
                  data-assistant-mode-trigger
                  disabled={isWorking}
                  onClick={() => setIsModeMenuOpen((open) => !open)}
                  ref={modeChipRef}
                  type="button"
                >
                  {mode === 'build'
                    ? <Bot aria-hidden="true" size={16} />
                    : <MessageCircle aria-hidden="true" size={16} />}
                  <span>{mode === 'build' ? 'Agent' : 'Ask'}</span>
                  <ChevronDown aria-hidden="true" className="text-ink-muted" size={14} />
                </button>
                {isModeMenuOpen ? (
                  <AssistantModeMenu
                    mode={mode}
                    onClose={closeModeMenu}
                    onConfigure={openModelSettings}
                    onEscape={closeModeMenuAndFocusChip}
                    onSelect={selectMode}
                  />
                ) : null}
              </div>
              <div className="relative shrink-0">
                <button
                  aria-controls={isSettingsOpen ? 'assistant-model-settings' : undefined}
                  aria-expanded={isSettingsOpen}
                  aria-haspopup="dialog"
                  aria-label="Model settings"
                  className="flex h-8 w-8 items-center justify-center rounded-tile text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600"
                  data-assistant-settings-trigger
                  onClick={() => setIsSettingsOpen((open) => !open)}
                  ref={settingsButtonRef}
                  title="Model settings"
                  type="button"
                >
                  <Shield aria-hidden="true" size={17} />
                </button>
              </div>
              <span className="flex-1" />
              <button
                aria-label="Send"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={draft.trim().length === 0 || isWorking || imageUnsupported || providerUnavailable}
                type="submit"
              >
                <ArrowUp aria-hidden="true" size={18} />
              </button>
            </div>
            {isSettingsOpen ? (
              <AssistantModelSettingsPopover
                isWorking={isWorking}
                onClose={closeModelSettings}
                providers={providers}
                selectedModelId={selectedModelId}
                selectedProviderId={selectedProviderId}
                setSelectedModelId={setSelectedModelId}
                setSelectedProviderId={setSelectedProviderId}
              />
            ) : null}
          </div>
        </form>
      </aside>
      {previewProposal ? (
        <PreviewOverlay
          collections={previewCollections}
          designSystem={previewProposal.preview.document.designSystem}
          onClose={() => setPreviewMessageId(null)}
          projectName={assistantProposalTitle(previewProposal)}
          projectType={conversation.projectType}
          sandboxOnly
          screens={previewProposal.preview.document.screens}
        />
      ) : null}
    </div>
  );
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
  onPreview,
  onContinue,
}: {
  message: AssistantMessage;
  onPreview: (opener: HTMLButtonElement) => void;
  onContinue: () => void;
}) {
  if (message.role === 'user') {
    return <div className="flex justify-end"><p className="max-w-[85%] rounded-panel rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">{message.text}</p></div>;
  }
  const proposal = message.proposal;
  const help = message.help;
  return (
    <div className="space-y-2" id={`assistant-message-${message.id}`}>
      {!proposal ? <p className="rounded-panel rounded-bl-sm bg-canvas px-3 py-2 text-sm text-ink">{message.text}</p> : null}
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
      {proposal ? <AssistantProposalCard onContinue={onContinue} onPreview={onPreview} proposal={proposal} status={message.status} /> : null}
    </div>
  );
}
