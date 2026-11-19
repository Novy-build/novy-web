import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAppTheme } from '../AppThemeContext';

interface ActionMenuNodeViewProps {
  label: string;
  itemLabel?: string;
  options: readonly string[];
  isPreview: boolean;
  onSelect?: (value: string) => void;
  menuStyle?: CSSProperties;
}

/** A per-item actions menu; its change event retains the renderer's item context. */
export function ActionMenuNodeView({ label, itemLabel, options, isPreview, onSelect, menuStyle }: ActionMenuNodeViewProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const appTheme = useAppTheme();
  const entries = options.filter((option) => option.trim().length > 0);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function dismiss(event: MouseEvent): void {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [open]);

  function toggle(): void {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      const width = 160;
      const height = entries.length * 44 + 8;
      setPosition({
        left: Math.max(8, Math.min(bounds.right - width, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(bounds.bottom, window.innerHeight - height - 8)),
      });
    }
    setOpen((current) => !current);
  }

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    if (buttons.length === 0) return;
    const current = buttons.findIndex((button) => button === document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={itemLabel ? `${label || 'Actions'}: ${itemLabel}` : label || 'Actions'}
        className="novy-widget-text flex h-full min-h-11 w-full min-w-11 items-center justify-center rounded-tile text-xl hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand-600"
        disabled={!isPreview || entries.length === 0}
        onClick={(event) => { event.stopPropagation(); toggle(); }}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open && createPortal(
        <div
          aria-label={label || 'Actions'}
          className={`novy-widget-text fixed z-[70] min-w-40 rounded-tile border border-hairline bg-surface p-1 shadow-lg ${appTheme ? `novy-app-theme-${appTheme.theme}` : ''}`}
          id={menuId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
          ref={menuRef}
          role="menu"
          style={{ ...menuStyle, left: position.left, top: position.top }}
        >
          {entries.map((option, index) => (
            <button
              className="novy-widget-text block min-h-11 w-full rounded-tile px-3 text-left text-sm hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand-600"
              key={`${option}-${index}`}
              onClick={() => { close(); onSelect?.(option); }}
              role="menuitem"
              type="button"
            >
              {option}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
