import { useCallback } from 'react';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import type { Project } from '@domain/entities/project';
import type { Template } from '@domain/entities/template';
import { instantiateTemplateProject } from '@domain/templates/instantiateTemplate';

/**
 * Narrow presentation hook exposing just project creation, so consumers such as
 * the app shell can open the New Project gallery without pulling the dashboard's
 * full project list loading lifecycle.
 */
export function useCreateProject(): (name: string, template: Template) => Promise<Project> {
  const { projects, appData } = useRepositories();

  return useCallback(
    async (name: string, template: Template): Promise<Project> => {
      return instantiateTemplateProject(name, template, { projects, appData });
    },
    [appData, projects],
  );
}
