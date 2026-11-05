import { useCallback, useEffect, useState } from 'react';
import type { Project, ProjectSummary } from '@domain/entities/project';
import type { Template } from '@domain/entities/template';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export interface ProjectsState {
  projects: ProjectSummary[];
  isLoading: boolean;
  hasFailed: boolean;
  reload: () => void;
  createProject: (name: string, template: Template) => Promise<Project>;
  renameProject: (projectId: string, name: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}

/**
 * Dashboard data orchestrator: loads project summaries once and re-fetches
 * after every mutation. Mutations themselves re-throw so dialogs/pages can
 * surface failures; the mock repositories establish the latency behavior.
 */
export function useProjects(): ProjectsState {
  const { projects: projectRepository } = useRepositories();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasFailed(false);

    void projectRepository
      .listProjects()
      .then((summaries) => {
        if (active) {
          setProjects(summaries);
        }
      })
      .catch(() => {
        if (active) {
          setHasFailed(true);
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
  }, [projectRepository, attempt]);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const createProject = useCallback(
    async (name: string, template: Template): Promise<Project> => {
      const created = await projectRepository.createProject(name, template);
      reload();
      return created;
    },
    [projectRepository, reload],
  );

  const renameProject = useCallback(
    async (projectId: string, name: string): Promise<void> => {
      await projectRepository.renameProject(projectId, name);
      reload();
    },
    [projectRepository, reload],
  );

  const duplicateProject = useCallback(
    async (projectId: string): Promise<void> => {
      await projectRepository.duplicateProject(projectId);
      reload();
    },
    [projectRepository, reload],
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      await projectRepository.deleteProject(projectId);
      reload();
    },
    [projectRepository, reload],
  );

  return {
    projects,
    isLoading,
    hasFailed,
    reload,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
  };
}
