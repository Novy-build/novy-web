import { PanelCollapseButton } from './PanelCollapseControl';

interface EditorRightRailProps {
  isInspectorCollapsed: boolean;
  onInspectorToggle: () => void;
  onOpenAssistant: () => void;
  showInspectorTab: boolean;
}

/** Single right-edge rail with the Inspector tab above the AI Assistant tab. */
export function EditorRightRail({
  isInspectorCollapsed,
  onInspectorToggle,
  onOpenAssistant,
  showInspectorTab,
}: EditorRightRailProps) {
  return (
    <aside
      aria-label={showInspectorTab && isInspectorCollapsed ? 'inspector panel minimized' : 'AI assistant panel'}
      className="flex w-11 shrink-0 flex-col items-center border-l border-hairline bg-surface"
    >
      {showInspectorTab ? (
        <>
          {isInspectorCollapsed ? (
            <PanelCollapseButton
              controls="design-inspector-panel"
              isCollapsed
              label="inspector panel"
              onToggle={onInspectorToggle}
              side="right"
            />
          ) : null}
          <button
            aria-label="inspector panel"
            className="flex w-full flex-1 items-center justify-center py-3 text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
            onClick={onInspectorToggle}
            title={isInspectorCollapsed ? 'Expand inspector panel' : 'Collapse inspector panel'}
            type="button"
          >
            <span className="rotate-180 text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
              inspector panel
            </span>
          </button>
          <div aria-hidden="true" className="my-2 w-5 shrink-0 border-t border-hairline" />
        </>
      ) : null}
      <button
        aria-label="AI assistant"
        className="flex w-full flex-1 flex-col items-center gap-3 py-3 text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
        onClick={onOpenAssistant}
        title="AI assistant"
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
          <path d="M19 13l.9 2.4L22.3 16.3l-2.4.9L19 19.6l-.9-2.4-2.4-.9 2.4-.9L19 13z" />
        </svg>
        <span className="rotate-180 text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
          AI assistant
        </span>
      </button>
    </aside>
  );
}
