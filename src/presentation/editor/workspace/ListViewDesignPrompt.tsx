import { Plus } from 'lucide-react';
import type { MouseEvent, PointerEvent } from 'react';

interface ListViewDesignPromptProps {
  onActivate: () => void;
}

/** Canvas-only entry point into a ListView's isolated item-template editor. */
export function ListViewDesignPrompt({ onActivate }: ListViewDesignPromptProps) {
  function stopPointerInteraction(event: PointerEvent<HTMLButtonElement>): void {
    event.stopPropagation();
  }

  function activate(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onActivate();
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <button
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-tile border border-brand-500 bg-brand-500/10 px-4 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-brand-300"
        onClick={activate}
        onPointerDown={stopPointerInteraction}
        type="button"
      >
        <Plus aria-hidden="true" size={16} strokeWidth={2.5} />
        Add item
      </button>
      <p className="max-w-56 text-xs leading-relaxed text-ink-muted">
        Design how each item displayed in this ListView should look.
      </p>
    </div>
  );
}
