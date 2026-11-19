import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Bot, Check, MessageCircle, Settings2 } from 'lucide-react';
import type { AssistantMode } from './useAssistantConversation';

interface AssistantModeMenuProps {
  mode: AssistantMode;
  onClose: () => void;
  onConfigure: () => void;
  onEscape: () => void;
  onSelect: (mode: AssistantMode) => void;
}

const ITEM_COUNT = 3;

/** VS Code-style mode selector anchored above the composer chip. */
export function AssistantModeMenu({
  mode,
  onClose,
  onConfigure,
  onEscape,
  onSelect,
}: AssistantModeMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(mode === 'build' ? 0 : 1);

  useEffect(() => {
    menuRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="menuitem"], [role="menuitemradio"]')
      [activeIndex]?.focus();
  }, [activeIndex]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (!target || menuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-assistant-mode-trigger]')) return;
      onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [onClose]);

  function activate(index: number): void {
    if (index === 0) onSelect('build');
    else if (index === 1) onSelect('help');
    else onConfigure();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : ITEM_COUNT - 1)) % ITEM_COUNT);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : ITEM_COUNT - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(activeIndex);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((current) => (current + (event.shiftKey ? ITEM_COUNT - 1 : 1)) % ITEM_COUNT);
    }
  }

  return (
    <div
      aria-label="Assistant mode"
      className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-tile border border-hairline bg-surface py-1 shadow-lg"
      id="assistant-mode-menu"
      onKeyDown={handleKeyDown}
      ref={menuRef}
      role="menu"
    >
      <MenuItem
        checked={mode === 'build'}
        icon={<Bot size={16} />}
        label="Agent"
        onClick={() => onSelect('build')}
        onFocus={() => setActiveIndex(0)}
        radio
      />
      <MenuItem
        checked={mode === 'help'}
        icon={<MessageCircle size={16} />}
        label="Ask"
        onClick={() => onSelect('help')}
        onFocus={() => setActiveIndex(1)}
        radio
      />
      <div className="my-1 border-t border-hairline" role="separator" />
      <MenuItem
        icon={<Settings2 size={16} />}
        label="Model settings…"
        onClick={onConfigure}
        onFocus={() => setActiveIndex(2)}
      />
    </div>
  );
}

function MenuItem({
  checked = false,
  icon,
  label,
  onClick,
  onFocus,
  radio = false,
}: {
  checked?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  onFocus: () => void;
  radio?: boolean;
}) {
  return (
    <button
      aria-checked={radio ? checked : undefined}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
      onClick={onClick}
      onFocus={onFocus}
      role={radio ? 'menuitemradio' : 'menuitem'}
      type="button"
    >
      <span aria-hidden="true" className="text-ink-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {radio && checked ? <Check aria-hidden="true" className="text-brand-600" size={16} /> : null}
    </button>
  );
}
