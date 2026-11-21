import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { FieldHelp } from '@presentation/components/ui/FieldHelp';

export interface FontFamilyOption {
  label: string;
  value: string;
  previewFamily: string;
}

export const BUNDLED_FONT_FAMILY_OPTIONS: readonly FontFamilyOption[] = [
  {
    label: 'Inter',
    value: "'Inter Variable', 'Inter', system-ui, sans-serif",
    previewFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
  },
  {
    label: 'JetBrains Mono',
    value: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
    previewFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
  },
  {
    label: 'System Sans',
    value: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    previewFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    label: 'System Serif',
    value: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
    previewFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  },
  {
    label: 'System Monospace',
    value: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    previewFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
  },
] as const;

const TEXT_INHERITANCE_OPTIONS: readonly FontFamilyOption[] = [
  {
    label: 'Default app font',
    value: '',
    previewFamily: 'var(--novy-app-font-body, var(--font-sans))',
  },
  {
    label: 'App heading font',
    value: 'var(--novy-app-font-heading)',
    previewFamily: 'var(--novy-app-font-heading, var(--font-sans))',
  },
] as const;

export function FontFamilyPicker({
  label,
  name,
  onChange,
  value,
  allowAppFonts = false,
  appFonts,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
  allowAppFonts?: boolean;
  appFonts?: { bodyFontFamily: string; headingFontFamily: string };
}) {
  const generatedId = useId();
  const buttonId = `${name}-${generatedId}-button`;
  const listboxId = `${name}-${generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const options = allowAppFonts
    ? [...TEXT_INHERITANCE_OPTIONS, ...BUNDLED_FONT_FAMILY_OPTIONS]
    : [...BUNDLED_FONT_FAMILY_OPTIONS];
  const normalizedFamily = (family: string): string => family.replace(/['"]/g, '').replace(/\s+/g, '').toLowerCase();
  const selectedIndex = options.findIndex((option) => normalizedFamily(option.value) === normalizedFamily(value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, listboxId, open]);

  function openAt(index: number): void {
    setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
    setOpen(true);
  }

  function choose(index: number): void {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
    document.getElementById(buttonId)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openAt(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const start = activeIndex + 1;
      const match = options.findIndex((_, index) => options[(start + index) % options.length]?.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (match >= 0) {
        event.preventDefault();
        setActiveIndex((start + match) % options.length);
      }
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }

  const displayLabel = selected?.label ?? (value.trim() ? 'Custom saved font' : 'Choose a font');
  const previewFamily = selected?.previewFamily ?? (value || undefined);

  return (
    <div className="relative grid gap-1" onBlur={handleBlur} ref={rootRef} style={appFonts ? {
      '--novy-app-font-body': appFonts.bodyFontFamily,
      '--novy-app-font-heading': appFonts.headingFontFamily,
    } as CSSProperties : undefined}>
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-ink-muted" htmlFor={buttonId} id={`${buttonId}-label`}>{label}</label>
        <FieldHelp
          helpKey={name}
          helpOptions={options.map((option) => ({ label: option.label }))}
          label={label}
        />
      </div>
      <button
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${buttonId}-label`}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-tile border border-hairline bg-surface px-3 text-left text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        id={buttonId}
        onClick={() => open ? setOpen(false) : openAt(selectedIndex >= 0 ? selectedIndex : 0)}
        onKeyDown={handleKeyDown}
        role="combobox"
        style={{ fontFamily: previewFamily }}
        type="button"
      >
        <span className="truncate">{displayLabel}</span>
        <span aria-hidden="true" className="font-sans text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div
          aria-labelledby={`${buttonId}-label`}
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-tile border border-hairline bg-surface p-1 shadow-lg"
          id={listboxId}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              aria-selected={index === selectedIndex}
              className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-600 ${index === activeIndex ? 'bg-canvas' : 'hover:bg-canvas'}`}
              id={`${listboxId}-option-${index}`}
              key={`${option.label}-${option.value}`}
              onClick={() => choose(index)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              style={{ fontFamily: option.previewFamily }}
              tabIndex={-1}
              type="button"
            >
              <span>{option.label}</span>
              <span aria-hidden="true">Aa</span>
            </button>
          ))}
        </div>
      ) : null}
      {!selected && value.trim() ? (
        <p className="text-xs text-ink-muted">This saved custom stack is preserved until you choose a curated font.</p>
      ) : null}
    </div>
  );
}
