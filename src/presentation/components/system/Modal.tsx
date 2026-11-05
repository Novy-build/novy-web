import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

interface ModalProps {
  /** Id of the dialog heading, wired to aria-labelledby. */
  labelledBy: string;
  onClose: () => void;
  /** Extra width classes on the panel, e.g. `max-w-2xl` for the gallery. */
  panelClassName?: string;
  children: ReactNode;
}

/**
 * Minimal accessible dialog: labelled panel on a scrim, Escape and scrim-click
 * to dismiss. Focus-trap polish lands in the a11y phase (Phase 8).
 */
export function Modal({ labelledBy, onClose, panelClassName = 'max-w-md', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        className={`w-full overflow-y-auto rounded-panel border border-hairline bg-surface p-6 shadow-lg outline-none ${panelClassName}`}
        onClick={handleOverlayClick}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
