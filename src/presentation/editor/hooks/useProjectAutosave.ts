import { useEffect, useRef } from 'react';
import type { ProjectDocument } from '@domain/entities/screen';
import { useRepositories } from '@main/providers/RepositoriesProvider';

interface AutosaveOptions {
  projectId: string;
  document: ProjectDocument;
  /** True once a reducer mutation changed the document since the last save. */
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onBegin: () => void;
  onSaved: (savedAt: Date) => void;
  /** Debounce window before the save fires (ms). */
  delayMs?: number;
}

export const DEFAULT_AUTOSAVE_DELAY_MS = 800;

/**
 * Debounced document autosave. Every present-document mutation re-arms the
 * timer; `onBegin` marks the saving state, `onSaved` on success. Failures are
 * logged and retried on the next edit — good enough for the mock phase.
 */
export function useProjectAutosave({
  projectId,
  document,
  hasUnsavedChanges,
  isSaving,
  onBegin,
  onSaved,
  delayMs = DEFAULT_AUTOSAVE_DELAY_MS,
}: AutosaveOptions): void {
  const { projects: projectRepository } = useRepositories();
  const onBeginRef = useRef(onBegin);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onBeginRef.current = onBegin;
    onSavedRef.current = onSaved;
  }, [onBegin, onSaved]);

  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      onBeginRef.current();
      void projectRepository
        .saveProjectDocument(projectId, document)
        .then(() => {
          if (!cancelled) {
            onSavedRef.current(new Date());
          }
        })
        .catch((error: unknown) => {
          console.warn('[novy] autosave failed:', error);
        });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasUnsavedChanges, isSaving, document, projectId, delayMs, projectRepository]);
}
