import type { Project, ProjectSummary } from '@domain/entities/project';
import { ProjectError } from '@domain/errors/ProjectError';
import type { AppDataRepository } from '@domain/repositories/appData.repository';
import type { ProjectImportRepository } from '@domain/repositories/projectImport.repository';
import type { ProjectRepository } from '@domain/repositories/project.repository';
import { readJson, writeJson, type StorageLike } from '../../storage/storage';
import { mapProjectFromDto, mapProjectToDto } from '../../mappers/project.mapper';
import type { ProjectListResponseDTO } from '../../dto/projectApi.dto';
import { isRecord, type ApiHttpClient, type ApiHttpResponse } from '../../api/http';
import { mapAppDataStoreToDto } from './ApiAppDataRepository';
import { mapApiProjectError, parseProjectResponse } from './ApiProjectRepository';

const PROJECTS_BASE = '/projects';
const IMPORTED_KEY = 'novy.imported-projects.v1';

interface ImportedMarkerStore {
  projectIds: string[];
}

/**
 * Uploads browser-local projects into the authenticated backend account.
 *
 * Local projects stay in localStorage until the builder removes them, and
 * successful imports are recorded so the same project is never offered twice.
 */
export class ApiProjectImportRepository implements ProjectImportRepository {
  private readonly client: ApiHttpClient;
  private readonly localProjects: ProjectRepository;
  private readonly localAppData: AppDataRepository;
  private readonly storage: StorageLike;

  constructor(
    client: ApiHttpClient,
    localProjects: ProjectRepository,
    localAppData: AppDataRepository,
    storage: StorageLike,
  ) {
    this.client = client;
    this.localProjects = localProjects;
    this.localAppData = localAppData;
    this.storage = storage;
  }

  async listImportableProjects(): Promise<ProjectSummary[]> {
    const [localProjects, remoteIds] = await Promise.all([
      this.localProjects.listProjects(),
      this.listRemoteProjectIds(),
    ]);
    const importedIds = new Set([...readImportedIds(this.storage), ...remoteIds]);
    return localProjects.filter((project) => !importedIds.has(project.id));
  }

  async importProject(projectId: string): Promise<Project> {
    const project = await this.localProjects.getProject(projectId);
    if (!project) {
      throw new ProjectError('not-found', 'The local project was not found.');
    }
    const appData = await this.localAppData.exportProjectData(projectId);

    let response: ApiHttpResponse;
    try {
      response = await this.client.post(`${PROJECTS_BASE}/import`, {
        project: mapProjectToDto(project),
        appData: mapAppDataStoreToDto(appData),
      });
    } catch (error) {
      throw mapApiProjectError(error);
    }

    const imported = parseProjectResponse(response.data);
    markImported(this.storage, projectId);
    return mapProjectFromDto({
      schemaVersion: imported.schemaVersion,
      id: imported.id,
      name: imported.name,
      createdAt: imported.createdAt,
      updatedAt: imported.updatedAt,
      screens: imported.screens,
    });
  }

  private async listRemoteProjectIds(): Promise<string[]> {
    try {
      const response = await this.client.get(PROJECTS_BASE);
      if (!isRecord(response.data) || !Array.isArray(response.data.projects)) {
        throw new ProjectError('unexpected', 'The backend returned an invalid project list.');
      }
      const payload = response.data as unknown as ProjectListResponseDTO;
      return payload.projects.map((project) => project.id);
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }
}

function readImportedIds(storage: StorageLike): string[] {
  const raw = readJson<ImportedMarkerStore>(storage, IMPORTED_KEY);
  if (!raw || !Array.isArray(raw.projectIds)) {
    return [];
  }
  return raw.projectIds.filter((value): value is string => typeof value === 'string');
}

function markImported(storage: StorageLike, projectId: string): void {
  const ids = new Set(readImportedIds(storage));
  ids.add(projectId);
  writeJson(storage, IMPORTED_KEY, { projectIds: [...ids] });
}
