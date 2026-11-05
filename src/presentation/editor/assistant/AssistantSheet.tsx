import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react';
import { describeProposal } from '@domain/ai/proposal';
import { useDialogFocus } from '@presentation/hooks/useDialogFocus';
import type { EditorAction, EditorState } from '../state/editorState';
import { useAssistantConversation, type AssistantMessage } from './useAssistantConversation';

interface AssistantSheetProps {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  onClose: () => void;
}

/**
 * Slide-over assistant panel. Proposals render as cards with Keep / Undo;
 * Keep applies the change through the editor reducer (one history step) and
 * Undo reverts it on the same command stack as manual edits.
 */
export function AssistantSheet({ state, dispatch, onClose }: AssistantSheetProps) {
  const { messages, send, keep, undo } = useAssistantConversation(state, dispatch);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useDialogFocus({ containerRef: panelRef, initialFocusRef: inputRef, onClose });

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    send(draft);
    setDraft('');
  }

  return (
    <div className="fixed inset-0 z-50" data-testid="assistant-overlay">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/30"
        data-testid="assistant-scrim"
        onClick={onClose}
      />
      <aside
        aria-labelledby="assistant-title"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-hairline bg-surface shadow-xl"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-ink" id="assistant-title">
              AI assistant
            </h2>
            <p className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              Demo responses — real AI arrives with the backend
            </p>
          </div>
          <button
            aria-label="Close assistant"
            className="rounded-tile px-2 py-1 text-lg leading-none text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div
          aria-live="polite"
          aria-relevant="additions text"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          data-testid="assistant-log"
          ref={logRef}
          role="log"
        >
          {messages.length === 0 ? (
            <div className="rounded-panel border border-dashed border-hairline bg-canvas p-4 text-sm text-ink-muted">
              <p className="font-medium text-ink">Try a demo command</p>
              <p className="mt-1">
                “add a button”, “add a heading”, “create a list of students”, or “make the text
                change when clicked”.
              </p>
              <p className="mt-2">
                Every proposal previews before touching the canvas — Keep applies it, Undo reverts
                it.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageRow key={message.id} message={message} onKeep={keep} onUndo={undo} />
            ))
          )}
        </div>

        <form aria-label="Assistant message form" className="border-t border-hairline p-3" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="assistant-message">
            Message
          </label>
          <div className="flex items-center gap-2">
            <input
              aria-label="Message"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-tile border border-hairline bg-surface px-3 text-sm text-ink outline-none focus:border-brand-600"
              id="assistant-message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask for a change…"
              ref={inputRef}
              value={draft}
            />
            <button
              className="h-10 shrink-0 rounded-tile bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              disabled={draft.trim().length === 0}
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function MessageRow({
  message,
  onKeep,
  onUndo,
}: {
  message: AssistantMessage;
  onKeep: (messageId: string) => void;
  onUndo: (messageId: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-panel rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[95%] space-y-2">
      <p className="rounded-panel rounded-bl-sm bg-canvas px-3 py-2 text-sm text-ink">{message.text}</p>
      {message.proposal ? (
        <div className="rounded-panel border border-hairline bg-surface p-3" data-testid="assistant-proposal">
          <p className="text-sm font-medium text-ink">{describeProposal(message.proposal)}</p>
          {message.status === 'pending' ? (
            <button
              className="mt-2 rounded-tile bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
              onClick={() => onKeep(message.id)}
              type="button"
            >
              Keep
            </button>
          ) : null}
          {message.status === 'applied' ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-brand-700">Applied — one undo step</span>
              <button
                className="rounded-tile border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
                onClick={() => onUndo(message.id)}
                type="button"
              >
                Undo
              </button>
            </div>
          ) : null}
          {message.status === 'undone' ? (
            <p className="mt-2 text-xs text-ink-muted">Undone. Ask again for a different change.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
