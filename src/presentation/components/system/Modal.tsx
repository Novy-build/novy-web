import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useDialogFocus } from '@presentation/hooks/useDialogFocus';

interface ModalProps {
  /** Id of the dialog heading, wired to aria-labelledby. */
  labelledBy: string;
  onClose: () => void;
  /** Extra width/height classes on the panel, e.g. `max-w-2xl` for the gallery. */
  panelClassName?: string;
  /** Whether the panel itself scrolls. Defaults to true. */
  panelScrollable?: boolean;
  /** Let the panel hug its content instead of stretching full width. */
  panelFitContent?: boolean;
  children: ReactNode;
}

/**
 * Accessible dialog foundation: labelled panel, trapped/restored focus,
 * background scroll lock, Escape, and scrim-click dismissal.
 */
export function Modal({
  labelledBy,
  onClose,
  panelClassName = 'max-w-md',
  panelScrollable = true,
  panelFitContent = false,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ containerRef: panelRef, onClose });

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`${panelFitContent ? 'w-auto' : 'w-full'} rounded-panel border border-hairline bg-surface p-6 shadow-lg outline-none ${panelScrollable ? 'overflow-y-auto' : 'overflow-hidden'} ${panelClassName}`}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
