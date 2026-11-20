import { createContext, useContext, useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, CircleHelp } from 'lucide-react';
import { getFieldHelp } from './fieldHelpContent';

/** Supplied by the editor so field help can open the in-app documentation assistant. */
export interface FieldHelpEnvironment {
  editor?: string;
  onAskNovy?: (query: string) => void;
}

export const FieldHelpEnvironmentContext = createContext<FieldHelpEnvironment>({});

export interface FieldHelpProps {
  /** Human-readable field name, used as the tooltip title and fallback lookup key. */
  label: string;
  /** Stable field key (usually the input `name`) used for the help registry lookup. */
  helpKey?: string;
  editor?: string;
  onAskNovy?: (query: string) => void;
  className?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

const TOOLTIP_WIDTH = 272;
const VIEWPORT_GAP = 8;

/**
 * Small help affordance for editor fields. Opens on hover and keyboard focus,
 * explains the field, and links into the assistant's documentation help mode.
 * Returns nothing outside an editor environment (e.g. auth and project forms).
 */
export function FieldHelp({
  label,
  helpKey,
  editor,
  onAskNovy,
  className,
}: FieldHelpProps) {
  const environment = useContext(FieldHelpEnvironmentContext);
  const askNovy = onAskNovy ?? environment.onAskNovy;
  const content = getFieldHelp(helpKey ?? label, label, editor ?? environment.editor);
  const tooltipId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, placement: 'top' });
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function place(): void {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const height = tooltipRef.current?.offsetHeight ?? 140;
      const top = rect.top - height - 8 >= VIEWPORT_GAP
        ? rect.top - height - 8
        : Math.min(rect.bottom + 8, window.innerHeight - height - VIEWPORT_GAP);
      const left = Math.max(
        VIEWPORT_GAP,
        Math.min(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_GAP),
      );
      setPosition({
        top: Math.max(VIEWPORT_GAP, top),
        left,
        placement: top < rect.top ? 'top' : 'bottom',
      });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!askNovy) return null;

  function handleBlur(event: FocusEvent<HTMLSpanElement>): void {
    const next = event.relatedTarget as Node | null;
    if (next && (rootRef.current?.contains(next) || tooltipRef.current?.contains(next))) return;
    setIsOpen(false);
  }

  const docsQuery = content.docsQuery ?? `What is “${label}” used for?`;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center ${className ?? ''}`}
      onBlur={handleBlur}
      onFocus={() => setIsOpen(true)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      ref={rootRef}
    >
      <span
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        aria-label={`About ${label}`}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-ink-muted/70 transition-colors hover:bg-canvas hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen((open) => !open);
          } else if (event.key === 'Escape') {
            event.stopPropagation();
            setIsOpen(false);
          }
        }}
        onMouseDown={(event) => event.preventDefault()}
        ref={triggerRef}
        role="button"
        tabIndex={0}
      >
        <CircleHelp aria-hidden="true" size={13} strokeWidth={2} />
      </span>
      {isOpen
        ? createPortal(
            <div
              className="z-[100] rounded-tile border border-hairline bg-surface p-3 shadow-lg"
              id={tooltipId}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setIsOpen(false);
              }}
              ref={tooltipRef}
              role="tooltip"
              style={{ left: position.left, position: 'fixed', top: position.top, width: TOOLTIP_WIDTH }}
            >
              <p className="text-xs font-semibold text-ink">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{content.description}</p>
              <button
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                onClick={() => {
                  setIsOpen(false);
                  askNovy(docsQuery);
                }}
                type="button"
              >
                Ask Novy about this
                <ArrowUpRight aria-hidden="true" size={12} />
              </button>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

/** Wraps a field label's text so the help affordance sits directly beside it. */
export function FieldHelpLabel({
  label,
  helpKey,
  className,
}: {
  label: ReactNode;
  helpKey?: string;
  className?: string;
}) {
  const text = typeof label === 'string' || typeof label === 'number' ? String(label) : '';
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 ${className ?? ''}`}>
      {label}
      <FieldHelp helpKey={helpKey} label={text} />
    </span>
  );
}
