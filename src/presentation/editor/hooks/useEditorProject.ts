import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@domain/entities/project';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export type EditorProjectStatus = 'loading' | 'ready' | 'notFound' | 'error';

export interface EditorProjectState {
  project: Project | null;
  status: EditorProjectStatus;
  /** Renames through the repository and updates the local copy. */
  renameProject: (name: string) => Promise<void>;
}

/**
 * Loads the project being edited. Name changes persist immediately through
 * the repository; document autosave is a separate concern.
 */
export function useEditorProject(projectId: string): EditorProjectState {
  const { projects: projectRepository } = useRepositories();
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<EditorProjectStatus>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');

    void projectRepository
      .getProject(projectId)
      .then((loaded) => {
        if (!active) {
          return;
        }
        setProject(loaded);
        setStatus(loaded !== null ? 'ready' : 'notFound');
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [projectRepository, projectId]);

  const renameProject = useCallback(
    async (name: string): Promise<void> => {
      const renamed = await projectRepository.renameProject(projectId, name);
      setProject((current) => (current ? { ...renamed, document: current.document } : renamed));
    },
    [projectRepository, projectId],
  );

  return { project, status, renameProject };
}
