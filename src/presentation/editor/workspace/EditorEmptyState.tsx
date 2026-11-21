import { Bot, PanelsTopLeft, Plus } from 'lucide-react';
import novyLogo from '@presentation/assets/novy-logo.png';

interface EditorEmptyStateProps {
  onAddScreen: () => void;
  onOpenAssistant: () => void;
  onOpenScreens: () => void;
}

const ACTION_CLASS = 'group flex w-full items-center justify-between gap-8 rounded-tile px-2 py-1.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500';

/** VS Code-inspired welcome surface shown when no screen tabs are open. */
export function EditorEmptyState({ onAddScreen, onOpenAssistant, onOpenScreens }: EditorEmptyStateProps) {
  return (
    <section
      aria-label="Empty editor"
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-canvas px-8 py-12"
    >
      <div className="flex -translate-y-4 flex-col items-center">
        <img
          alt=""
          aria-hidden="true"
          className="h-56 w-56 select-none object-contain opacity-[0.12] grayscale"
          data-testid="empty-editor-logo"
          draggable={false}
          src={novyLogo}
        />
        <h2 className="sr-only">No screens open</h2>
        <div className="mt-2 w-72" role="group" aria-label="Empty editor actions">
          <button className={ACTION_CLASS} onClick={onOpenScreens} type="button">
            <span className="flex items-center gap-2.5">
              <PanelsTopLeft aria-hidden="true" className="h-4 w-4" />
              Open a screen
            </span>
            <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">Screens</kbd>
          </button>
          <button className={ACTION_CLASS} onClick={onAddScreen} type="button">
            <span className="flex items-center gap-2.5">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create a screen
            </span>
            <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">+</kbd>
          </button>
          <button className={ACTION_CLASS} onClick={onOpenAssistant} type="button">
            <span className="flex items-center gap-2.5">
              <Bot aria-hidden="true" className="h-4 w-4" />
              Ask Novy
            </span>
            <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">AI</kbd>
          </button>
        </div>
      </div>
    </section>
  );
}
