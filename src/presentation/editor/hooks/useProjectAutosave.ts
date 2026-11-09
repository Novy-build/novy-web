import { useEffect, useRef, useState } from 'react';
import type { ProjectDocument } from '@domain/entities/screen';
import { useRepositories } from '@main/providers/RepositoriesProvider';

interface AutosaveOptions {
  projectId: string;
  document: ProjectDocument;
  /** True once a reducer mutation changed the document since the last save. */
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onBegin: () => void;
  onSaved: (savedAt: Date, savedDocument: ProjectDocument) => void;
  onFailed: (message: string) => void;
  /** Debounce window before the save fires (ms). */
  delayMs?: number;
}

export const DEFAULT_AUTOSAVE_DELAY_MS = 800;

/**
 * Debounced document autosave. Every present-document mutation re-arms the
 * timer; `onBegin` marks the saving state and the request remains relevant
 * across that state-driven rerender. Success reports the exact saved snapshot
 * so newer edits stay dirty; failures clear the busy state and are retried.
 */
export function useProjectAutosave({
  projectId,
  document,
  hasUnsavedChanges,
  isSaving,
  onBegin,
  onSaved,
  onFailed,
  delayMs = DEFAULT_AUTOSAVE_DELAY_MS,
}: AutosaveOptions): void {
  const { projects: projectRepository } = useRepositories();
  const onBeginRef = useRef(onBegin);
  const onSavedRef = useRef(onSaved);
  const onFailedRef = useRef(onFailed);
  const [retryToken, setRetryToken] = useState(0);
  const mountedRef = useRef(true);
  const activeProjectIdRef = useRef(projectId);
  activeProjectIdRef.current = projectId;

  useEffect(() => {
    onBeginRef.current = onBegin;
    onSavedRef.current = onSaved;
    onFailedRef.current = onFailed;
  }, [onBegin, onSaved, onFailed]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) {
      return;
    }

    const documentToSave = document;
    const projectIdToSave = projectId;
    const timer = window.setTimeout(() => {
      onBeginRef.current();
      void projectRepository
        .saveProjectDocument(projectIdToSave, documentToSave)
        .then(() => {
          if (mountedRef.current && activeProjectIdRef.current === projectIdToSave) {
            onSavedRef.current(new Date(), documentToSave);
          }
        })
        .catch((error: unknown) => {
          console.warn('[novy] autosave failed:', error);
          if (mountedRef.current && activeProjectIdRef.current === projectIdToSave) {
            onFailedRef.current(error instanceof Error ? error.message : 'Project could not be saved.');
            setRetryToken((current) => current + 1);
          }
        });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasUnsavedChanges, isSaving, document, projectId, delayMs, projectRepository, retryToken]);
}
