import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router';
import { ArrowUpRight, CircleHelp } from 'lucide-react';
import { FieldHelpEnvironmentContext } from '@presentation/components/ui/FieldHelp';
import { getLogicNodeHelp, helpKeyForDefinition } from './logicNodeHelpContent';
import type { LogicNodeDefinition } from './logicNodeRegistry';

const TOOLTIP_WIDTH = 320;
const VIEWPORT_GAP = 8;
const CLOSE_DELAY_MS = 150;

interface TooltipPosition {
  top: number;
  left: number;
}

/**
 * The (?) affordance shown next to every Logic library node. It explains the
 * node and links to a dedicated, visual "how to use" guide in a new tab.
 */
export function LogicNodeHelp({
  definition,
  className = '',
}: {
  definition: LogicNodeDefinition;
  className?: string;
}) {
  const environment = useContext(FieldHelpEnvironmentContext);
  const askNovy = environment.onAskNovy;
  const content = getLogicNodeHelp(definition);
  const helpKey = helpKeyForDefinition(definition);
  const { projectId } = useParams<{ projectId: string }>();
  const editorPath = projectId ? `/project/${encodeURIComponent(projectId)}/editor` : undefined;
  const exampleHref = `/docs/logic-nodes/${encodeURIComponent(helpKey)}`
    + (editorPath ? `?from=${encodeURIComponent(editorPath)}` : '');
  const docsQuery = `How do I use the “${definition.label}” node in the Logic builder?`;
  const tooltipId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringFocus = useRef(false);

  function cancelClose(): void {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose(): void {
    cancelClose();
    closeTimer.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!isOpen) return;

    function place(): void {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const height = tooltipRef.current?.offsetHeight ?? 240;
      const top = rect.top - height - 8 >= VIEWPORT_GAP
        ? rect.top - height - 8
        : Math.min(rect.bottom + 8, window.innerHeight - height - VIEWPORT_GAP);
      const left = Math.max(
        VIEWPORT_GAP,
        Math.min(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_GAP),
      );
      setPosition({ top: Math.max(VIEWPORT_GAP, top), left });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  function closeAndFocus(): void {
    cancelClose();
    restoringFocus.current = true;
    setIsOpen(false);
    triggerRef.current?.focus();
    setTimeout(() => { restoringFocus.current = false; }, 0);
  }

  function toggleOpen(event: MouseEvent | ReactKeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    cancelClose();
    setIsOpen((open) => !open);
  }

  function handleBlur(event: FocusEvent<HTMLSpanElement>): void {
    const next = event.relatedTarget as Node | null;
    if (next && (rootRef.current?.contains(next) || tooltipRef.current?.contains(next))) return;
    scheduleClose();
  }

  return (
    <span
      className={`relative inline-flex shrink-0 items-center ${className}`}
      onBlur={handleBlur}
      onFocus={() => {
        if (restoringFocus.current) return;
        cancelClose();
        setIsOpen(true);
      }}
      onMouseEnter={() => { cancelClose(); setIsOpen(true); }}
      onMouseLeave={scheduleClose}
      ref={rootRef}
    >
      <span
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        aria-label={`About ${definition.label}`}
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-ink-muted/70 transition-colors hover:bg-canvas hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') toggleOpen(event);
          else if (event.key === 'Escape') {
            event.stopPropagation();
            closeAndFocus();
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
                if (event.key !== 'Escape') return;
                event.stopPropagation();
                closeAndFocus();
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              ref={tooltipRef}
              role="tooltip"
              style={{ left: position.left, position: 'fixed', top: position.top, width: TOOLTIP_WIDTH }}
            >
              <p className="text-xs font-semibold text-ink">{definition.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{definition.description}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink">{content.summary}</p>
              <div className="mt-2 border-t border-hairline pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Example flow</p>
                <ol className="mt-1 grid gap-1">
                  {content.example.nodes.slice(0, 3).map((step, index) => (
                    <li className="flex gap-1.5 text-[11px] leading-snug" key={`${step.label}-${index}`}>
                      <span aria-hidden="true" className="text-ink-muted">{index + 1}.</span>
                      <span>
                        <span className="font-medium text-ink">{step.label}</span>
                        <span className="text-ink-muted"> — {step.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline pt-2">
                <a
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  href={exampleHref}
                  onClick={() => setIsOpen(false)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View example
                  <ArrowUpRight aria-hidden="true" size={12} />
                </a>
                {askNovy ? (
                  <button
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    onClick={() => {
                      setIsOpen(false);
                      askNovy(docsQuery);
                    }}
                    type="button"
                  >
                    Ask Novy about this
                    <ArrowUpRight aria-hidden="true" size={12} />
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
