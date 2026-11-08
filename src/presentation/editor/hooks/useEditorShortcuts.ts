import { useEffect } from 'react';
import type { EditorAction } from '../state/editorState';

const SNAP_NUDGE_PX = 8;
const FINE_NUDGE_PX = 1;

interface ShortcutOptions {
  dispatch: (action: EditorAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedNodeId: string | null;
  isItemDesign?: boolean;
  isFrameSelected?: boolean;
}

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/**
 * Global editor keyboard shortcuts:
 *   Delete/Backspace  remove the selected node
 *   Cmd/Ctrl+D        duplicate the selected node
 *   Cmd/Ctrl+Z        undo  (Shift: redo)
 *   Arrows            nudge the selected node 8px (Shift: 1px)
 *   Escape            clear selection
 * Typing in form fields never triggers editor shortcuts.
 */
export function useEditorShortcuts({ dispatch, canUndo, canRedo, selectedNodeId, isItemDesign = false, isFrameSelected = false }: ShortcutOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isTypingInField(event.target)) {
        return;
      }

      const meta = event.metaKey || event.ctrlKey;

      // Item design owns Escape so it can step from child to frame to close.
      if (event.key === 'Escape' && !isItemDesign) {
        dispatch({ type: 'node/select', nodeId: null });
        return;
      }
      if (event.key === 'Escape') {
        return;
      }

      if (meta && event.key.toLowerCase() === 'z') {
        if (!event.shiftKey && !canUndo) {
          return;
        }
        if (event.shiftKey && !canRedo) {
          return;
        }
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'history/redo' : 'history/undo' });
        return;
      }

      if (isFrameSelected) {
        if (event.key === 'Delete' || event.key === 'Backspace' || (meta && event.key.toLowerCase() === 'd')) {
          event.preventDefault();
        }
        return;
      }

      if (meta && event.key.toLowerCase() === 'd') {
        if (!selectedNodeId) {
          return;
        }
        event.preventDefault();
        dispatch({ type: 'node/duplicate', nodeId: selectedNodeId });
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedNodeId) {
          return;
        }
        event.preventDefault();
        dispatch({ type: 'node/delete', nodeId: selectedNodeId });
        return;
      }

      const direction = readArrowDirection(event.key);
      if (selectedNodeId && direction) {
        event.preventDefault();
        const step = event.shiftKey ? FINE_NUDGE_PX : SNAP_NUDGE_PX;
        dispatch({
          type: 'node/nudge',
          nodeId: selectedNodeId,
          dx: direction.x * step,
          dy: direction.y * step,
        });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canUndo, canRedo, selectedNodeId, isItemDesign, isFrameSelected]);
}

const ARROW_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

function readArrowDirection(key: string): { x: number; y: number } | undefined {
  return ARROW_DIRECTIONS[key];
}
