import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorTopBar, autosaveStatusText, type AutosaveStatus } from './EditorTopBar';
import { validateProject } from '@domain/validation/projectValidation';
function autosave(overrides: Partial<AutosaveStatus> = {}): AutosaveStatus {
  return {
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: new Date('2026-01-01T10:00:00Z'),
    error: null,
    ...overrides,
  };
}

function renderTopBar(overrides: Record<string, unknown> = {}) {
  const props = {
    projectName: 'My App',
    onRenameProject: vi.fn().mockResolvedValue(undefined),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onPreview: vi.fn(),
    onDeploy: vi.fn(),
    saving: autosave(),
    validation: validateProject({ screens: [] }),
    ...overrides,
  };
  render(<EditorTopBar {...props} />);
  return props;
}

describe('EditorTopBar', () => {
  it('wires chrome actions: preview, deploy, undo, redo', () => {
    const props = renderTopBar({ canUndo: true, canRedo: true });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));
    fireEvent.click(screen.getByLabelText('Undo'));
    fireEvent.click(screen.getByLabelText('Redo'));

    expect(props.onPreview).toHaveBeenCalledTimes(1);
    expect(props.onDeploy).toHaveBeenCalledTimes(1);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onRedo).toHaveBeenCalledTimes(1);
  });

  it('shows the Novy logo instead of an Exit work button', () => {
    renderTopBar();

    expect(screen.getByRole('img', { name: 'Novy' })).toHaveAttribute('src', expect.stringContaining('novy-logo'));
    expect(screen.queryByRole('button', { name: 'Exit work' })).not.toBeInTheDocument();
  });

  it('disables undo/redo when history is empty', () => {
    renderTopBar();

    expect(screen.getByLabelText('Undo')).toBeDisabled();
    expect(screen.getByLabelText('Redo')).toBeDisabled();
  });

  it('does not duplicate workspace navigation from the activity rail', () => {
    renderTopBar();

    expect(screen.queryByRole('group', { name: 'Editor mode' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'design' })).not.toBeInTheDocument();
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
    expect(autosaveStatusText(autosave({ error: 'offline' }), new Date())).toBe('Save failed — retrying… (offline)');
    expect(autosaveStatusText(autosave({ hasUnsavedChanges: true }), new Date())).toBe('Unsaved changes');
    expect(
      autosaveStatusText(autosave({ lastSavedAt: new Date('2026-01-01T10:00:00Z') }), new Date('2026-01-01T10:04:00Z')),
    ).toBe('Saved 4m ago');
    expect(autosaveStatusText(autosave({ lastSavedAt: null }), new Date())).toBe(
      'Changes save automatically',
    );
  });

  it('announces autosave failures as an alert', () => {
    renderTopBar({ saving: autosave({ error: 'offline', hasUnsavedChanges: true }) });
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed — retrying… (offline)');
  });
});
