import { useEffect, useRef, useState } from 'react';

interface AssistantProposalActionsProps {
  hasExistingContent: boolean;
  isWorking: boolean;
  isApplying: boolean;
  canApply: boolean;
  onAccept: () => Promise<void>;
  onRefine: () => void;
  onDiscard: () => void;
}

/** Kept outside the conversation scroller so the next step is always visible. */
export function AssistantProposalActions({ hasExistingContent, isWorking, isApplying, canApply, onAccept, onRefine, onDiscard }: AssistantProposalActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const restoreApplyFocusRef = useRef(false);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (restoreApplyFocusRef.current) {
      restoreApplyFocusRef.current = false;
      applyRef.current?.focus();
    }
  }, [confirming]);

  function cancel(): void {
    restoreApplyFocusRef.current = true;
    setConfirming(false);
  }

  function useDraft(): void {
    if (isWorking || !canApply) return;
    if (hasExistingContent && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    void onAccept();
  }

  return (
    <section
      aria-label="Draft actions"
      className="shrink-0 border-t border-hairline bg-surface px-4 py-3 [@media(max-height:500px)]:py-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && confirming) {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
      }}
    >
      {confirming ? (
        <div aria-label="Confirm replacing project screens" className="space-y-3" role="region">
          <p className="text-sm font-semibold text-ink">Replace your current screens?</p>
          <p className="text-xs leading-relaxed text-ink-muted">Using this draft replaces this project’s screens and workflows and adds its new data collections. Existing saved records are not deleted.</p>
          <div className="flex gap-2">
            <button className="min-h-11 flex-1 rounded-tile border border-hairline px-3 text-sm font-medium text-ink hover:bg-canvas" onClick={cancel} ref={cancelRef} type="button">Cancel</button>
            <button className="min-h-11 flex-1 rounded-tile bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50" disabled={isWorking || !canApply} onClick={useDraft} type="button">Replace and use app</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink-muted" role={isApplying ? 'status' : undefined}>
            {isApplying ? 'Applying your app and saving it to this project…' : canApply ? 'Not applied to your project yet.' : 'Resolve the check issues before using this draft.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="min-h-11 flex-1 rounded-tile bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50" disabled={isWorking || !canApply} onClick={useDraft} ref={applyRef} type="button">{isApplying ? 'Applying…' : 'Use this app'}</button>
            <button className="min-h-11 flex-1 rounded-tile border border-hairline px-3 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50" disabled={isWorking} onClick={onRefine} type="button">Make changes</button>
            <button className="min-h-11 basis-full text-left text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50 [@media(max-height:500px)]:basis-auto" disabled={isWorking} onClick={onDiscard} type="button">Discard draft</button>
          </div>
        </>
      )}
    </section>
  );
}
