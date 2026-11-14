import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@domain/entities/project';
import type { ProjectDocument } from '@domain/entities/screen';
import { useState, type PropsWithChildren } from 'react';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';
import { makeDocument, makeScreen } from '@test/editorFixtures';
import { DEFAULT_AUTOSAVE_DELAY_MS, useProjectAutosave } from './useProjectAutosave';

const DOC_A: ProjectDocument = makeDocument([makeScreen('screen_1', [])]);

const STUB_PROJECT: Project = {
  id: 'project_1',
  name: 'Stub project',
  projectType: 'app',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
  document: DOC_A,
};
const DOC_B: ProjectDocument = makeDocument([
  makeScreen('screen_2', [], 'About'),
  makeScreen('screen_1', []),
]);

interface HarnessOptions {
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  document?: ProjectDocument;
  delayMs?: number;
}

function renderSave(options: HarnessOptions = {}) {
  const repositories = createStubRepositories({ sessionUser: STUB_USER });
  const save = vi.spyOn(repositories.projects, 'saveProjectDocument').mockResolvedValue(STUB_PROJECT);
  const onBegin = vi.fn(() => undefined);
  const onSaved = vi.fn((_savedAt: Date, _savedDocument: ProjectDocument) => undefined);
  const onFailed = vi.fn((_message: string) => undefined);

  const wrapper = ({ children }: PropsWithChildren) => (
    <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
  );

  const { rerender } = renderHook(
    (current: HarnessOptions) =>
      useProjectAutosave({
        projectId: 'project_1',
        document: current.document ?? DOC_A,
        hasUnsavedChanges: current.hasUnsavedChanges ?? true,
        isSaving: current.isSaving ?? false,
        onBegin,
        onSaved,
        onFailed,
        delayMs: current.delayMs,
      }),
    { initialProps: options, wrapper },
  );

  return { save, onBegin, onSaved, onFailed, rerender };
}

describe('useProjectAutosave', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces with the documented default of 800ms', () => {
    expect(DEFAULT_AUTOSAVE_DELAY_MS).toBe(800);
  });

  it('saves once after the debounce and reports the lifecycle', async () => {
    const { save, onBegin, onSaved } = renderSave({ hasUnsavedChanges: true });

    await vi.runAllTimersAsync();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('project_1', DOC_A);
    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(expect.any(Date), DOC_A);
  });

  it('stays idle when nothing is unsaved', async () => {
    const { save, onBegin } = renderSave({ hasUnsavedChanges: false });

    await vi.runAllTimersAsync();

    expect(save).not.toHaveBeenCalled();
    expect(onBegin).not.toHaveBeenCalled();
  });

  it('does not arm a timer while a save is already running', async () => {
    const { save } = renderSave({ isSaving: true });

    await vi.runAllTimersAsync();

    expect(save).not.toHaveBeenCalled();
  });

  it('restarts the debounce when the document changes mid-window', async () => {
    const { save, rerender } = renderSave({ document: DOC_A });

    await vi.advanceTimersByTimeAsync(400);
    rerender({ document: DOC_B });

    // The first timer (due t=800) was cancelled by the rerender at t=400.
    await vi.advanceTimersByTimeAsync(400);
    expect(save).not.toHaveBeenCalled();

    // The restart timer fires at t=400 + 800 = 1200 with the new document.
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]).toEqual(['project_1', DOC_B]);
  });

  it('honors the custom delay override', async () => {
    const { save } = renderSave({ delayMs: 300 });

    await vi.advanceTimersByTimeAsync(299);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('finishes an in-flight save after the saving-state rerender', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    let resolveSave: (project: Project) => void = () => undefined;
    const save = vi.spyOn(repositories.projects, 'saveProjectDocument').mockImplementation(
      () => new Promise<Project>((resolve) => { resolveSave = resolve; }),
    );
    const onBegin = vi.fn();
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    const wrapper = ({ children }: PropsWithChildren) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    );
    const { rerender } = renderHook(
      (isSaving: boolean) => useProjectAutosave({
        projectId: 'project_1', document: DOC_A, hasUnsavedChanges: true, isSaving,
        onBegin, onSaved, onFailed,
      }),
      { initialProps: false, wrapper },
    );

    await vi.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_DELAY_MS);
    expect(save).toHaveBeenCalledTimes(1);
    expect(onBegin).toHaveBeenCalledTimes(1);
    rerender(true);
    await act(async () => resolveSave(STUB_PROJECT));

    expect(onSaved).toHaveBeenCalledWith(expect.any(Date), DOC_A);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('logs failures instead of pretending the save landed', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    vi.spyOn(repositories.projects, 'saveProjectDocument').mockRejectedValue(new Error('offline'));
    const onBegin = vi.fn(() => undefined);
    const onSaved = vi.fn((_savedAt: Date, _savedDocument: ProjectDocument) => undefined);
    const onFailed = vi.fn((_message: string) => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const wrapper = ({ children }: PropsWithChildren) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    );
    renderHook(
      () =>
        useProjectAutosave({
          projectId: 'project_1',
          document: DOC_A,
          hasUnsavedChanges: true,
          isSaving: false,
          onBegin,
          onSaved,
          onFailed,
        }),
      { wrapper },
    );

    await vi.runAllTimersAsync();

    expect(warnSpy.mock.calls[0]?.[0]).toBe('[novy] autosave failed:');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledWith('offline');
  });

  it('clears the failed busy state and retries the dirty document', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const save = vi.spyOn(repositories.projects, 'saveProjectDocument')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(STUB_PROJECT);
    const wrapper = ({ children }: PropsWithChildren) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    );
    const lifecycle: string[] = [];
    const { result } = renderHook(() => {
      const [isSaving, setIsSaving] = useState(false);
      const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
      useProjectAutosave({
        projectId: 'project_1',
        document: DOC_A,
        hasUnsavedChanges,
        isSaving,
        onBegin: () => { lifecycle.push('begin'); setIsSaving(true); },
        onSaved: () => { lifecycle.push('saved'); setIsSaving(false); setHasUnsavedChanges(false); },
        onFailed: () => { lifecycle.push('failed'); setIsSaving(false); },
      });
      return { isSaving, hasUnsavedChanges };
    }, { wrapper });

    await act(async () => vi.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_DELAY_MS));
    expect(lifecycle).toEqual(['begin', 'failed']);
    expect(result.current).toEqual({ isSaving: false, hasUnsavedChanges: true });

    await act(async () => vi.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(2);
    expect(lifecycle).toEqual(['begin', 'failed', 'begin', 'saved']);
    expect(result.current).toEqual({ isSaving: false, hasUnsavedChanges: false });
  });
});
