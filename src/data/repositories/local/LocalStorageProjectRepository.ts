import type { Project, ProjectSummary } from '@domain/entities/project';
import type { ProjectRepository } from '@domain/repositories/project.repository';
import type { ProjectDocument } from '@domain/entities/screen';
import type { Template } from '@domain/entities/template';
import { createProjectFromTemplate } from '@domain/factories/screen';
import { generateId } from '@domain/ids';
import {
  mapProjectFromDto,
  mapProjectToDto,
  mapProjectToSummary,
} from '../../mappers/project.mapper';
import type { ProjectCollectionDTO, ProjectDTO } from '../../dto/project.dto';
import { readJson, sleep, writeJson, type StorageLike } from '../../storage/storage';

const PROJECTS_KEY = 'novy.projects.v1';
const DEFAULT_LATENCY_MS = 250;

export interface LocalStoreOptions {
  latencyMs?: number;
  /** Injectable clock so tests control timestamps deterministically. */
  now?: () => Date;
}

/**
 * localStorage-backed project store with simulated network latency.
 * Swapping in the Axios/Supabase implementation later only touches data/.
 */
export class LocalStorageProjectRepository implements ProjectRepository {
  private readonly storage: StorageLike;
  private readonly latencyMs: number;
  private readonly now: () => Date;

  constructor(storage: StorageLike, options?: LocalStoreOptions) {
    this.storage = storage;
    this.latencyMs = options?.latencyMs ?? DEFAULT_LATENCY_MS;
    this.now = options?.now ?? (() => new Date());
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await sleep(this.latencyMs);
    const summaries = this.readAll().map((project) => mapProjectToSummary(mapProjectFromDto(project)));
    summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return summaries;
  }

  async createProject(name: string, template: Template): Promise<Project> {
    await sleep(this.latencyMs);
    const created = createProjectFromTemplate(template, name, this.now());
    writeJson(this.storage, PROJECTS_KEY, {
      projects: [...this.readAll(), mapProjectToDto(created)],
    });
    return created;
  }

  async getProject(projectId: string): Promise<Project | null> {
    await sleep(this.latencyMs);
    const match = this.readAll().find((project) => project.id === projectId);
    return match ? mapProjectFromDto(match) : null;
  }

  async saveProjectDocument(projectId: string, document: ProjectDocument): Promise<Project> {
    await sleep(this.latencyMs);
    const projects = this.readAll();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const previous = mapProjectFromDto(projects[index]);
    const updated: Project = {
      ...previous,
      document,
      updatedAt: this.now(),
    };
    projects[index] = mapProjectToDto(updated);
    writeJson(this.storage, PROJECTS_KEY, { projects });
    return updated;
  }

  async renameProject(projectId: string, name: string): Promise<Project> {
    await sleep(this.latencyMs);
    const projects = this.readAll();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const previous = mapProjectFromDto(projects[index]);
    const updated: Project = { ...previous, name, updatedAt: this.now() };
    projects[index] = mapProjectToDto(updated);
    writeJson(this.storage, PROJECTS_KEY, { projects });
    return updated;
  }

  async duplicateProject(projectId: string): Promise<Project> {
    await sleep(this.latencyMs);
    const projects = this.readAll();
    const source = projects.find((project) => project.id === projectId);
    if (!source) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const now = this.now().toISOString();
    const copy: ProjectDTO = {
      ...structuredClone(source),
      id: generateId('project'),
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    writeJson(this.storage, PROJECTS_KEY, { projects: [...projects, copy] });
    return mapProjectFromDto(copy);
  }

  async deleteProject(projectId: string): Promise<void> {
    await sleep(this.latencyMs);
    writeJson(this.storage, PROJECTS_KEY, {
      projects: this.readAll().filter((project) => project.id !== projectId),
    });
  }

  private readAll(): ProjectDTO[] {
    return readJson<ProjectCollectionDTO>(this.storage, PROJECTS_KEY)?.projects ?? [];
  }
}
