import type { Project, ProjectSummary } from '../entities/project';

/**
 * Explicit local-to-remote project migration. Implementations read browser
 * projects and app data, upload them to the authenticated account, and keep
 * the local copy until the builder confirms the import succeeded.
 */
export interface ProjectImportRepository {
  listImportableProjects(): Promise<ProjectSummary[]>;
  importProject(projectId: string): Promise<Project>;
}
