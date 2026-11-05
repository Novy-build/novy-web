import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorTopBar, autosaveStatusText, type AutosaveStatus } from './EditorTopBar';

function autosave(overrides: Partial<AutosaveStatus> = {}): AutosaveStatus {
  return {
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

function renderTopBar(overrides: Record<string, unknown> = {}) {
  const props = {
    projectName: 'My App',
    onRenameProject: vi.fn().mockResolvedValue(undefined),
    mode: 'design' as const,
    onModeChange: vi.fn(),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onPreview: vi.fn(),
    onDeploy: vi.fn(),
    onBack: vi.fn(),
    saving: autosave(),
    ...overrides,
  };
  render(<EditorTopBar {...props} />);
  return props;
}

describe('EditorTopBar', () => {
  it('wires chrome actions: back, preview, deploy, undo, redo', () => {
    const props = renderTopBar({ canUndo: true, canRedo: true });

    fireEvent.click(screen.getByLabelText('Back to projects'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));
    fireEvent.click(screen.getByLabelText('Undo'));
    fireEvent.click(screen.getByLabelText('Redo'));

    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onPreview).toHaveBeenCalledTimes(1);
    expect(props.onDeploy).toHaveBeenCalledTimes(1);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onRedo).toHaveBeenCalledTimes(1);
  });

  it('disables undo/redo when history is empty', () => {
    renderTopBar();

    expect(screen.getByLabelText('Undo')).toBeDisabled();
    expect(screen.getByLabelText('Redo')).toBeDisabled();
  });

  it('switches editor modes with pressed states', () => {
    const props = renderTopBar({ mode: 'design' });

    const group = screen.getByRole('group', { name: 'Editor mode' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'design' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'logic' }));

    expect(props.onModeChange).toHaveBeenCalledWith('logic');
  });

  it('renames the project inline through the form', async () => {
    const props = renderTopBar();

    fireEvent.click(screen.getByRole('button', { name: 'My App' }));
    const input = screen.getByLabelText('Project name');
    fireEvent.change(input, { target: { value: 'Renamed App' } });
    fireEvent.submit(input.closest('form')!);
    await vi.waitFor(() => expect(props.onRenameProject).toHaveBeenCalledWith('Renamed App'));
  });

  it('ignores blank renames', () => {
    const props = renderTopBar();

    fireEvent.click(screen.getByRole('button', { name: 'My App' }));
    const input = screen.getByLabelText('Project name');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(props.onRenameProject).not.toHaveBeenCalled();
  });

  it('surfaces a rename failure instead of losing the edit silently', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('gone'));
    renderTopBar({ onRenameProject: failing });

    fireEvent.click(screen.getByRole('button', { name: 'My App' }));
    const input = screen.getByLabelText('Project name');
    fireEvent.change(input, { target: { value: 'Will fail' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('Rename failed. The tab may have closed.')).toBeInTheDocument();
  });

  it('describes the autosave state', () => {
    expect(autosaveStatusText(autosave({ isSaving: true }), new Date())).toBe('Saving…');
    expect(autosaveStatusText(autosave({ hasUnsavedChanges: true }), new Date())).toBe('Unsaved changes');
    expect(
      autosaveStatusText(autosave({ lastSavedAt: new Date('2026-01-01T10:00:00Z') }), new Date('2026-01-01T10:04:00Z')),
    ).toBe('Saved 4m ago');
    expect(autosaveStatusText(autosave({ lastSavedAt: null }), new Date())).toBe(
      'Changes save automatically',
    );
  });
});
