import { fireEvent, render, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorAction } from '../state/editorState';
import { useEditorShortcuts } from './useEditorShortcuts';

interface ShortcutOptions {
  canUndo?: boolean;
  canRedo?: boolean;
  selectedNodeId?: string | null;
}

function mountShortcuts(options: ShortcutOptions = {}) {
  const actions = vi.fn<(action: EditorAction) => void>();

  const { rerender } = renderHook(
    (current?: ShortcutOptions) =>
      useEditorShortcuts({
        dispatch: actions,
        canUndo: current?.canUndo === undefined ? (options.canUndo ?? false) : current.canUndo,
        canRedo: current?.canRedo === undefined ? (options.canRedo ?? false) : current.canRedo,
        selectedNodeId:
          current?.selectedNodeId === undefined
            ? (options.selectedNodeId === undefined ? 'node_1' : options.selectedNodeId)
            : current.selectedNodeId,
      }),
    { initialProps: options },
  );

  return {
    actions,
    rerender: (next: ShortcutOptions) => rerender(next),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('useEditorShortcuts', () => {
  it('clears the selection on Escape', () => {
    const { actions } = mountShortcuts();

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(actions).toHaveBeenCalledWith({ type: 'node/select', nodeId: null });
  });

  it('deletes the selected node on Delete and Backspace', () => {
    const { actions } = mountShortcuts();

    fireEvent.keyDown(document.body, { key: 'Delete' });
    expect(actions).toHaveBeenLastCalledWith({ type: 'node/delete', nodeId: 'node_1' });

    fireEvent.keyDown(document.body, { key: 'Backspace' });
    expect(actions).toHaveBeenLastCalledWith({ type: 'node/delete', nodeId: 'node_1' });
  });

  it('duplicates only while a node is selected', () => {
    const { actions, rerender } = mountShortcuts();

    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true });
    expect(actions).toHaveBeenCalledWith({ type: 'node/duplicate', nodeId: 'node_1' });

    rerender({ selectedNodeId: null });
    fireEvent.keyDown(document.body, { key: 'd', ctrlKey: true });
    expect(actions).toHaveBeenCalledTimes(1);
  });

  it('gates undo and redo on history availability', () => {
    const { actions, rerender } = mountShortcuts();

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(actions).not.toHaveBeenCalled();

    rerender({ canUndo: true, canRedo: true });
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(actions).toHaveBeenLastCalledWith({ type: 'history/undo' });

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(actions).toHaveBeenLastCalledWith({ type: 'history/redo' });
  });

  it('nudges with arrows: 8px coarse, 1px with Shift', () => {
    const { actions } = mountShortcuts();

    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(actions).toHaveBeenLastCalledWith({ type: 'node/nudge', nodeId: 'node_1', dx: 8, dy: 0 });

    fireEvent.keyDown(document.body, { key: 'ArrowLeft', shiftKey: true });
    expect(actions).toHaveBeenLastCalledWith({ type: 'node/nudge', nodeId: 'node_1', dx: -1, dy: 0 });

    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    expect(actions).toHaveBeenLastCalledWith({ type: 'node/nudge', nodeId: 'node_1', dx: 0, dy: -8 });

    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    expect(actions).toHaveBeenLastCalledWith({ type: 'node/nudge', nodeId: 'node_1', dx: 0, dy: 8 });
  });

  it('ignores shortcuts while typing in form fields', () => {
    const { actions } = mountShortcuts();
    const { getByLabelText } = render(<input aria-label="Typing field" />);

    fireEvent.keyDown(getByLabelText('Typing field'), { key: 'Delete' });
    fireEvent.keyDown(getByLabelText('Typing field'), { key: 'z', ctrlKey: true });

    expect(actions).not.toHaveBeenCalled();
  });

  it('ignores nudges without a selection', () => {
    const { actions } = mountShortcuts({ selectedNodeId: null });

    fireEvent.keyDown(document.body, { key: 'ArrowRight' });

    expect(actions).not.toHaveBeenCalled();
  });
});
