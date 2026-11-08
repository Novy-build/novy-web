import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface LayerOrderMenuProps {
  trigger: HTMLElement;
  nodeName: string;
  isFront: boolean;
  isBack: boolean;
  onFront: () => void;
  onBack: () => void;
  onClose: () => void;
}

interface Position {
  top: number;
  left: number;
}

const MENU_WIDTH = 168;
const MENU_HEIGHT = 76;

export function LayerOrderMenu({
  trigger,
  nodeName,
  isFront,
  isBack,
  onFront,
  onBack,
  onClose,
}: LayerOrderMenuProps): React.ReactPortal {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  useEffect(() => {
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    let top = rect.bottom + 4;
    if (top + MENU_HEIGHT > window.innerHeight && rect.top > MENU_HEIGHT + 8) {
      top = rect.top - MENU_HEIGHT - 4;
    }
    setPosition({ top, left });
    const firstEnabled = menuRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    firstEnabled?.focus();
  }, [trigger]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (target && !menuRef.current?.contains(target) && !trigger.contains(target)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        trigger.focus();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [trigger, onClose]);

  return createPortal(
    <div
      aria-label={`Layer order for ${nodeName}`}
      className="fixed z-[60] overflow-hidden rounded-tile border border-hairline bg-surface shadow-lg"
      ref={menuRef}
      role="menu"
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
    >
      <button
        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isFront}
        onClick={() => {
          onFront();
          onClose();
        }}
        role="menuitem"
        title={isFront ? 'Already at front' : 'Bring to front'}
        type="button"
      >
        Bring to front
      </button>
      <button
        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isBack}
        onClick={() => {
          onBack();
          onClose();
        }}
        role="menuitem"
        title={isBack ? 'Already at back' : 'Send to back'}
        type="button"
      >
        Send to back
      </button>
    </div>,
    document.body,
  );
}