import { Plus } from 'lucide-react';

interface AddSectionButtonProps {
  onClick: () => void;
}

export function AddSectionButton({ onClick }: AddSectionButtonProps) {
  return (
    <button
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-panel border border-hairline bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-brand-400 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      onClick={onClick}
      type="button"
    >
      <Plus aria-hidden="true" size={17} />
      Add section
    </button>
  );
}
