/**
 * Floating entry point of the AI assistant. Visible in both editor modes;
 * the preview overlay (z-50) covers it while previewing.
 */
export function AssistantChip({
  onOpen,
  isHidden = false,
}: {
  onOpen: () => void;
  isHidden?: boolean;
}) {
  return (
    <button
      aria-hidden={isHidden || undefined}
      className="fixed bottom-5 right-5 z-40 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-surface shadow-lg transition-colors hover:bg-ink/90"
      disabled={isHidden}
      onClick={onOpen}
      style={isHidden ? { display: 'none' } : undefined}
      tabIndex={isHidden ? -1 : undefined}
      type="button"
    >
      ✨ AI assistant
    </button>
  );
}
