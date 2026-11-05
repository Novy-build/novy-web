import type { Project, ProjectSummary } from '../entities/project';
import type { ProjectDocument } from '../entities/screen';
import type { Template } from '../entities/template';

/**
 * Persistence contract for projects and their documents.
 * The data layer provides a localStorage implementation now and an API-backed
 * implementation later — presentation code only ever depends on this.
 */
export interface ProjectRepository {
  listProjects(): Promise<ProjectSummary[]>;
  createProject(name: string, template: Template): Promise<Project>;
  getProject(projectId: string): Promise<Project | null>;
  /** Debounced autosave lands on this; implementations stamp updatedAt. */
  saveProjectDocument(projectId: string, document: ProjectDocument): Promise<Project>;
  renameProject(projectId: string, name: string): Promise<Project>;
  duplicateProject(projectId: string): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
}
