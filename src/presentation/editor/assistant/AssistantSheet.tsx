import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Bot, ChevronDown, ChevronLeft, ChevronRight, MessageCircle, Plus, RefreshCw, Shield, X } from 'lucide-react';
import type { AssistantReferenceAttachment } from '@domain/entities/assistant';
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
import { VisualCaptureStage } from './VisualCaptureStage';
import { captureScreenFrames, screensForCapture } from './visualCapture';

interface AssistantSheetProps {
  conversation: AssistantConversation;
  onClose: () => void;
  /** Field help request: opens help mode with a prepared documentation question. */
  helpRequest?: { query: string; token: number } | null;
}

export function AssistantSheet({ conversation, onClose, helpRequest }: AssistantSheetProps) {
  const {
    messages, mode, isWorking, operation, isAvailable, providers,
    capabilitiesStatus, capabilitiesError, reloadCapabilities, designPipelineV2,
    referenceLimits, pendingReferences,
    selectedProviderId, setSelectedProviderId, selectedModelId, setSelectedModelId,
    qualityMode, setQualityMode,
    setMode, send, accept, reviewVisual, continueUnreviewed, reject,
  } = conversation;
  const visibleMessages = useMemo(() => messages.filter((message) => message.mode === mode), [messages, mode]);
  const pendingMessage = [...visibleMessages].reverse().find((message) => message.status === 'pending' && message.proposal);
  const [previewMessageId, setPreviewMessageId] = useState<string | null>(null);
  const previewMessage = messages.find((message) => message.id === previewMessageId);
  const previewProposal = previewMessage?.proposal;
  const previewCollections = useMemo(() => previewProposal ? assistantPreviewCollections(previewProposal) : [], [previewProposal]);
  const previewSeedRecords = useMemo(() => {
    const records = previewProposal?.preview.seedRecords;
    if (!records) return undefined;
    return Object.fromEntries(previewProposal.blueprint.collections.flatMap((collection, index) => {
      const collectionId = previewCollections[index]?.id;
      const values = records[collection.key];
      return collectionId && values ? [[collectionId, values]] : [];
    }));
  }, [previewCollections, previewProposal]);
  const [isRefining, setIsRefining] = useState(false);
  const [draft, setDraft] = useState('');
  const [references, setReferences] = useState<AssistantReferenceAttachment[]>([]);
  const [imageError, setImageError] = useState('');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reviewState, setReviewState] = useState<{
    messageId: string;
    phase: 'capturing' | 'reviewing' | 'error';
    error?: string;
  } | null>(null);
  const reviewStateRef = useRef(reviewState);
  reviewStateRef.current = reviewState;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const captureStartedRef = useRef(false);
  const reviewProposal = reviewState
    ? messages.find((message) => message.id === reviewState.messageId)?.proposal
    : undefined;
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
    setReferences([]);
    setImageError('');
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
    setReferences([]);
    setImageError('');
    closeModeMenuAndFocusChip();
  }

  function openModelSettings(): void {
    setIsModeMenuOpen(false);
    setIsSettingsOpen(true);
    // A fresh look at the provider controls retries a previously failed probe.
    if (capabilitiesStatus === 'error') reloadCapabilities();
  }

  function closeModelSettings(): void {
    setIsSettingsOpen(false);
    settingsButtonRef.current?.focus();
  }

  function toggleModelSettings(): void {
    if (isSettingsOpen) closeModelSettings();
    else openModelSettings();
  }

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const lastMessage = visibleMessages.at(-1);
    const draftCard = lastMessage?.proposal ? document.getElementById(`assistant-message-${lastMessage.id}`) : null;
    log.scrollTop = draftCard ? Math.max(0, draftCard.offsetTop - log.offsetTop) : log.scrollHeight;
  }, [visibleMessages, isWorking]);

  function submitDraft(): void {
    if ((!draft.trim() && (!designPipelineV2 || references.length === 0)) || isWorking) return;
    const message = draft;
    setDraft('');
    setIsRefining(false);
    const submittedReferences = references;
    setReferences([]);
    setImageError('');
    void send(message, submittedReferences);
  }

  const handleCaptureReady = useCallback((container: HTMLElement): void => {
    const state = reviewStateRef.current;
    if (!state || state.phase !== 'capturing' || captureStartedRef.current) return;
    captureStartedRef.current = true;
    const proposal = messagesRef.current.find((message) => message.id === state.messageId)?.proposal;
    const requests = proposal?.visualReview?.captureRequests;
    if (!proposal || !requests?.length) return;
    void (async () => {
      try {
        const captures = await captureScreenFrames(container, requests);
        setReviewState({ messageId: state.messageId, phase: 'reviewing' });
        await reviewVisual(state.messageId, captures);
        setReviewState(null);
      } catch {
        setReviewState({
          messageId: state.messageId,
          phase: 'error',
          error: 'Visual review could not be completed. Your draft was not changed.',
        });
      }
    })();
  }, [reviewVisual]);

  const handleCaptureError = useCallback((message: string): void => {
    const state = reviewStateRef.current;
    if (state) setReviewState({ ...state, phase: 'error', error: message });
  }, []);

  function startVisualReview(messageId: string): void {
    captureStartedRef.current = false;
    setReviewState({ messageId, phase: 'capturing' });
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
    setReferences(pendingReferences);
    inputRef.current?.focus();
  }

  async function handleImages(
    event: ChangeEvent<HTMLInputElement>,
    replaceIndex?: number,
  ): Promise<void> {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
    const selectedFiles = replaceIndex === undefined ? files : files.slice(0, 1);
    const retained = replaceIndex === undefined
      ? references
      : references.filter((_, index) => index !== replaceIndex);
    if (retained.length + selectedFiles.length > maxReferenceCount) {
      setImageError(`Attach at most ${maxReferenceCount} design references for this model.`);
      return;
    }
    if (selectedFiles.some((file) => !allowed.includes(file.type as typeof allowed[number]))) {
      setImageError('Choose PNG, JPEG, GIF, or WebP references.');
      return;
    }
    if (selectedFiles.some((file) => file.size > referenceLimits.maxBytesEach)) {
      setImageError(`Each reference must not exceed ${formatMiB(referenceLimits.maxBytesEach)}.`);
      return;
    }
    const retainedBytes = retained.reduce(
      (total, reference) => total + base64ByteLength(reference.contentBase64),
      0,
    );
    if (retainedBytes + selectedFiles.reduce((total, file) => total + file.size, 0) > referenceLimits.maxBytesTotal) {
      setImageError(`References must not exceed ${formatMiB(referenceLimits.maxBytesTotal)} in total.`);
      return;
    }
    let additions: AssistantReferenceAttachment[];
    try {
      additions = await Promise.all(selectedFiles.map(async (file, offset) => {
        const dataUrl = await readAsDataUrl(file);
        const encoded = dataUrl.split(',', 2)[1];
        if (!encoded) throw new Error('Could not read image.');
        return {
          name: safeReferenceName(file.name),
          mimeType: file.type as AssistantReferenceAttachment['mimeType'],
          contentBase64: encoded,
          role: replaceIndex === undefined
            ? 'design-reference'
            : references[replaceIndex]?.role ?? 'design-reference',
          order: replaceIndex ?? retained.length + offset,
        };
      }));
    } catch {
      setImageError('One or more references could not be read.');
      return;
    }
    const next = replaceIndex === undefined
      ? [...references, ...additions]
      : references.map((reference, index) => index === replaceIndex ? additions[0]! : reference);
    setReferences(canonicalReferences(next));
    setImageError('');
  }

  function removeReference(index: number): void {
    setReferences((current) => canonicalReferences(current.filter((_, candidate) => candidate !== index)));
    setImageError('');
  }

  function moveReference(index: number, direction: -1 | 1): void {
    setReferences((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return canonicalReferences(next);
    });
  }

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
  const selectedModel = selectedProvider?.models.find((model) => model.id === selectedModelId);
  const selectedCapability = selectedModel ?? selectedProvider;
  const maxReferenceCount = Math.min(
    referenceLimits.maxCount,
    selectedCapability?.maxImages ?? referenceLimits.maxCount,
  );
  const imageUnsupported = Boolean(references.length > 0 && selectedCapability && !selectedCapability.imageInput);
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
              {!isAvailable
                ? 'Backend connection required'
                : capabilitiesStatus === 'loading'
                  ? 'Loading assistant providers…'
                  : capabilitiesStatus === 'error'
                    ? <>Couldn't load providers · <button className="underline transition-colors hover:text-ink" onClick={reloadCapabilities} title={capabilitiesError ?? undefined} type="button">Retry</button></>
                    : selectedProvider
                      ? `${selectedModel?.name ?? assistantProviderLabel(selectedProvider.id)} · ${selectedCapability?.location === 'local' ? 'local' : 'remote processing'}`
                      : 'No assistant providers configured'}
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

        {reviewState && reviewState.phase === 'capturing' && reviewProposal ? (
          <VisualCaptureStage
            designSystem={reviewProposal.preview.document.designSystem}
            onError={handleCaptureError}
            onReady={handleCaptureReady}
            requests={reviewProposal.visualReview?.captureRequests ?? []}
            screens={screensForCapture(
              reviewProposal.preview.document,
              reviewProposal.visualReview?.captureRequests ?? [],
            )}
          />
        ) : null}
        {designPipelineV2 && pendingMessage?.proposal?.visualReview?.required
          && pendingMessage.proposal.visualReview.status !== 'reviewed'
          && pendingMessage.proposal.visualReview.status !== 'continued-unreviewed' ? (
          <div className="border-t border-hairline p-3" data-testid="assistant-visual-review-panel">
            <p className="mb-2 text-xs text-ink-muted">
              Compare the rendered draft with your references before applying it. Captures stay in
              memory and are sent only to the explicitly selected provider.
            </p>
            {reviewState?.phase === 'error' ? (
              <p className="mb-2 text-xs text-red-600" role="alert">{reviewState.error}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                className="min-h-11 rounded-tile bg-brand-600 px-3 text-sm font-semibold text-white"
                disabled={isWorking || reviewState?.phase === 'reviewing' || reviewState?.phase === 'capturing'}
                onClick={() => startVisualReview(pendingMessage.id)}
                type="button"
              >
                {reviewState?.phase === 'error' ? 'Retry visual review' : 'Review visual match'}
              </button>
              {reviewState?.phase === 'error' ? (
                <>
                  <button
                    className="min-h-11 rounded-tile border border-hairline px-3 text-sm text-ink"
                    onClick={() => {
                      continueUnreviewed(pendingMessage.id);
                      setReviewState(null);
                    }}
                    type="button"
                  >
                    Continue without review
                  </button>
                  <button
                    className="min-h-11 rounded-tile px-3 text-sm text-ink-muted"
                    onClick={() => setReviewState(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
            {reviewState?.phase === 'reviewing' ? (
              <p className="mt-2 text-xs text-ink-muted" aria-live="polite">Comparing rendered screens…</p>
            ) : null}
          </div>
        ) : null}
        {pendingMessage?.proposal ? (
          <AssistantProposalActions
            canApply={pendingMessage.proposal.verification?.passed !== false}
            hasExistingContent={conversation.hasExistingContent}
            isApplying={operation === 'apply'}
            isWorking={isWorking}
            key={pendingMessage.id}
            onAccept={async () => {
              setReferences([]);
              setIsRefining(false);
              await accept(pendingMessage.id);
            }}
            onDiscard={() => {
              setReferences([]);
              setIsRefining(false);
              reject(pendingMessage.id);
            }}
            onRefine={refineDraft}
          />
        ) : null}

        <form aria-label="Assistant message form" className="shrink-0 border-t border-hairline p-3" onSubmit={handleSubmit}>
          {selectedCapability?.costWarning ? (
            <p className="mb-2 text-xs text-amber-700">
              {selectedModel?.usageNote || 'This remote provider may incur usage charges.'}
            </p>
          ) : null}
          {designPipelineV2 && mode === 'build' ? (
            <fieldset className="mb-2 flex flex-wrap items-center gap-3">
              <legend className="sr-only">Generation quality</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ink">
                <input
                  checked={qualityMode === 'standard'}
                  disabled={isWorking}
                  name="assistant-quality"
                  onChange={() => setQualityMode('standard')}
                  type="radio"
                />
                Standard
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ink">
                <input
                  checked={qualityMode === 'high-fidelity'}
                  disabled={isWorking}
                  name="assistant-quality"
                  onChange={() => setQualityMode('high-fidelity')}
                  type="radio"
                />
                High fidelity
              </label>
              {qualityMode === 'high-fidelity' ? (
                <p className="w-full text-xs text-ink-muted" data-testid="assistant-quality-disclosure">
                  High fidelity runs additional bounded model stages, including a design review pass.
                  It can take several minutes with GPT-6.1 Terra. With a remote provider, references
                  and previews leave Novy and may incur cost. If a stage fails, no lower-fidelity
                  draft is substituted.
                </p>
              ) : null}
            </fieldset>
          ) : null}
          {isRefining && pendingMessage ? <p className="mb-2 text-xs text-ink-muted">Describe what you’d like to change. Your current draft stays until a new one is ready.</p> : null}
          <div className="relative rounded-panel border border-hairline bg-surface p-2 transition-colors focus-within:border-brand-600">
            {references.length > 0 ? (
              <ul aria-label="Design references" className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {references.map((reference, index) => (
                  <li className="min-w-0 rounded-tile border border-hairline bg-canvas p-2" key={`${reference.name}-${index}`}>
                    <img
                      alt={`Preview of ${reference.name}`}
                      className="h-16 w-full rounded-tile object-cover"
                      src={`data:${reference.mimeType};base64,${reference.contentBase64}`}
                    />
                    <p className="mt-1 truncate text-xs text-ink" title={reference.name}>{index + 1}. {reference.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button aria-label={`Move ${reference.name} earlier`} className="flex h-11 w-11 items-center justify-center rounded-tile text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-30" disabled={index === 0} onClick={() => moveReference(index, -1)} type="button"><ChevronLeft aria-hidden="true" size={16} /></button>
                      <button aria-label={`Move ${reference.name} later`} className="flex h-11 w-11 items-center justify-center rounded-tile text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-30" disabled={index === references.length - 1} onClick={() => moveReference(index, 1)} type="button"><ChevronRight aria-hidden="true" size={16} /></button>
                      <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-tile text-ink-muted hover:bg-surface hover:text-ink">
                        <RefreshCw aria-hidden="true" size={15} />
                        <span className="sr-only">Replace {reference.name}</span>
                        <input accept="image/png,image/jpeg,image/gif,image/webp" aria-label={`Replace ${reference.name}`} className="sr-only" disabled={isWorking} onChange={(event) => void handleImages(event, index)} type="file" />
                      </label>
                      <button aria-label={`Remove ${reference.name}`} className="flex h-11 w-11 items-center justify-center rounded-tile text-ink-muted hover:bg-surface hover:text-ink" onClick={() => removeReference(index)} type="button"><X aria-hidden="true" size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
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
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-tile text-ink-muted transition-colors hover:bg-canvas hover:text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40">
                <Plus aria-hidden="true" size={18} />
                <span className="sr-only">Attach design references</span>
                <input
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  aria-label="Attach design references"
                  className="sr-only"
                  disabled={isWorking || imageUnsupported || references.length >= maxReferenceCount}
                  multiple={designPipelineV2}
                  onChange={(event) => void handleImages(event)}
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
                  onClick={toggleModelSettings}
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
                disabled={
                  (draft.trim().length === 0 && (!designPipelineV2 || references.length === 0))
                  || isWorking
                  || imageUnsupported
                  || providerUnavailable
                }
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
                capabilitiesStatus={capabilitiesStatus}
                capabilitiesError={capabilitiesError}
                onReloadCapabilities={reloadCapabilities}
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
          seedRecords={previewSeedRecords}
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

function canonicalReferences(
  references: AssistantReferenceAttachment[],
): AssistantReferenceAttachment[] {
  return references.map((reference, order) => ({ ...reference, order }));
}

function base64ByteLength(contentBase64: string): number {
  const padding = contentBase64.endsWith('==') ? 2 : contentBase64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(contentBase64.length * 3 / 4) - padding);
}

function formatMiB(bytes: number): string {
  const value = bytes / (1024 * 1024);
  return `${Number.isInteger(value) ? value : value.toFixed(1)} MiB`;
}

function safeReferenceName(name: string): string {
  return name.replace(/[\\/\0]/g, '-').slice(0, 120) || 'reference';
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
