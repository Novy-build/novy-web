import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface InspectorSectionProps {
  title: string;
  children: ReactNode;
  /** Sections stay open by default, matching the existing inspector behaviour. */
  defaultOpen?: boolean;
  /** Optional trailing control rendered in the section header. */
  action?: ReactNode;
}

/**
 * Compact, collapsible inspector section. Mirrors the section rhythm of a
 * design tool without changing any of the fields it contains.
 */
export function InspectorSection({ title, children, defaultOpen = true, action }: InspectorSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section aria-label={title} className="border-b border-hairline py-3 first:pt-0 last:border-b-0">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <button
          aria-expanded={isOpen}
          className="flex min-h-7 flex-1 items-center gap-1.5 text-left"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? (
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{title}</span>
        </button>
        {action}
      </div>
      <div className={`mt-3 grid gap-2 ${isOpen ? '' : 'hidden'}`}>{children}</div>
    </section>
  );
}
