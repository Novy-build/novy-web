import { useCallback, useEffect, useState } from 'react';
import type { ProjectSummary } from '@domain/entities/project';
import { ProjectError } from '@domain/errors/ProjectError';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export interface ProjectImportState {
  importableProjects: ProjectSummary[];
  isLoading: boolean;
  importingProjectId: string | null;
  notice: string | null;
  error: string | null;
  importProject: (projectId: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Lists browser-local projects that have not been uploaded yet and imports
 * one on request. Imported local data is never deleted here: the builder
 * keeps it until they explicitly remove it from the browser.
 */
export function useProjectImport(onImported?: () => void): ProjectImportState {
  const { localProjectImport } = useRepositories();
  const [importableProjects, setImportableProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(localProjectImport));
  const [importingProjectId, setImportingProjectId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!localProjectImport) {
      setImportableProjects([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    void localProjectImport
      .listImportableProjects()
      .then((projects) => {
        if (active) {
          setImportableProjects(projects);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setImportableProjects([]);
          setError(describeImportError(cause));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, localProjectImport]);

  const refresh = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const importProject = useCallback(
    async (projectId: string): Promise<void> => {
      if (!localProjectImport || importingProjectId !== null) {
        return;
      }
      setImportingProjectId(projectId);
      setNotice(null);
      setError(null);

      try {
        const imported = await localProjectImport.importProject(projectId);
        setImportableProjects((current) =>
          current.filter((project) => project.id !== projectId),
        );
        setNotice(`Imported "${imported.name}" into your account.`);
        onImported?.();
      } catch (cause) {
        setError(describeImportError(cause));
      } finally {
        setImportingProjectId(null);
      }
    },
    [importingProjectId, localProjectImport, onImported],
  );

  return {
    importableProjects,
    isLoading,
    importingProjectId,
    notice,
    error,
    importProject,
    refresh,
  };
}

function describeImportError(cause: unknown): string {
  if (!(cause instanceof ProjectError)) {
    return 'The project could not be imported. Try again in a moment.';
  }
  switch (cause.code) {
    case 'already-exists':
      return 'This project already exists in your account.';
    case 'not-found':
      return 'The local project is no longer available in this browser.';
    case 'validation':
      return 'This project could not be validated. Open it once, then try again.';
    case 'session-expired':
      return 'Your session expired. Sign in again to import projects.';
    case 'rate-limited':
      return 'Too many import attempts. Wait a moment and try again.';
    case 'timeout':
      return 'The backend took too long to respond. Try again in a moment.';
    case 'network':
    case 'unavailable':
      return 'The backend could not be reached. Check your connection and try again.';
    default:
      return 'The project could not be imported. Try again in a moment.';
  }
}
