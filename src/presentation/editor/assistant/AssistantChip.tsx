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
      aria-label="AI assistant"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-surface shadow-lg transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      disabled={isHidden}
      onClick={onOpen}
      style={isHidden ? { display: 'none' } : undefined}
      tabIndex={isHidden ? -1 : undefined}
      title="AI assistant"
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-6 w-6"
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
    </button>
  );
}
