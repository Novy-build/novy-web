import axios from 'axios';
import type { Project, ProjectSummary } from '@domain/entities/project';
import type { ProjectDocument } from '@domain/entities/screen';
import type { Template } from '@domain/entities/template';
import { ProjectError } from '@domain/errors/ProjectError';
import type { ProjectRepository } from '@domain/repositories/project.repository';
import {
  firstIssueMessage,
  isRecord,
  readApiErrorEnvelope,
  type ApiErrorEnvelope,
  type ApiHttpClient,
} from '../../api/http';
import type {
  ProjectListResponseDTO,
  ProjectResponseDTO,
  ProjectSummaryDTO,
} from '../../dto/projectApi.dto';
import { mapProjectFromDto, mapScreenFromDto, mapScreenToDto } from '../../mappers/project.mapper';
import { mapTemplateToDto } from '../../mappers/template.mapper';

const PROJECTS_BASE = '/projects';

/**
 * Backend-backed project persistence. Optimistic concurrency uses the
 * revision returned by the API as a quoted ETag; every save sends `If-Match`.
 */
export class ApiProjectRepository implements ProjectRepository {
  readonly isRemote = true;
  readonly provisionsTemplateData = true;

  private readonly client: ApiHttpClient;
  private readonly revisions = new Map<string, number>();

  constructor(client: ApiHttpClient) {
    this.client = client;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    try {
      const response = await this.client.get(PROJECTS_BASE);
      return parseProjectList(response.data).projects.map(mapSummary);
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async createProject(name: string, template: Template): Promise<Project> {
    try {
      const response = await this.client.post(PROJECTS_BASE, {
        name,
        template: mapTemplateToDto(template),
      });
      return this.adopt(parseProjectResponse(response.data));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      const response = await this.client.get(projectPath(projectId));
      return this.adopt(parseProjectResponse(response.data));
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw mapApiProjectError(error);
    }
  }

  async saveProjectDocument(projectId: string, document: ProjectDocument): Promise<Project> {
    let revision = this.revisions.get(projectId);
    if (revision === undefined) {
      const loaded = await this.getProject(projectId);
      if (!loaded) {
        throw new ProjectError('not-found', 'The project was not found.');
      }
      revision = this.revisions.get(projectId);
      if (revision === undefined) {
        throw new ProjectError('unexpected', 'The backend did not return a project revision.');
      }
    }

    try {
      const response = await this.client.put(
        `${projectPath(projectId)}/document`,
        {
          schemaVersion: 13,
          screens: document.screens.map(mapScreenToDto),
        },
        { headers: { 'If-Match': `"${revision}"` } },
      );
      return this.adopt(parseProjectResponse(response.data));
    } catch (error) {
      if (isStaleRevisionError(error)) {
        // A retried save can outlive its own successful request. Refreshing
        // the revision lets the next debounced save succeed, while the typed
        // error still tells the editor that a conflict happened.
        await this.refreshRevision(projectId);
      }
      throw mapApiProjectError(error);
    }
  }

  async renameProject(projectId: string, name: string): Promise<Project> {
    try {
      const response = await this.client.patch(projectPath(projectId), { name });
      return this.adopt(parseProjectResponse(response.data));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async duplicateProject(projectId: string): Promise<Project> {
    try {
      const response = await this.client.post(`${projectPath(projectId)}/duplicate`);
      return this.adopt(parseProjectResponse(response.data));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.client.delete(projectPath(projectId));
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw mapApiProjectError(error);
      }
    } finally {
      this.revisions.delete(projectId);
    }
  }

  private adopt(dto: ProjectResponseDTO): Project {
    this.revisions.set(dto.id, dto.revision);
    return mapProjectFromDto({
      schemaVersion: dto.schemaVersion,
      id: dto.id,
      name: dto.name,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      screens: dto.screens,
    });
  }

  private async refreshRevision(projectId: string): Promise<void> {
    try {
      await this.getProject(projectId);
    } catch {
      // Keep the previous revision when the refresh itself fails; the next
      // save reports the real backend error.
    }
  }
}

function projectPath(projectId: string): string {
  return `${PROJECTS_BASE}/${encodeURIComponent(projectId)}`;
}

function mapSummary(dto: ProjectSummaryDTO): ProjectSummary {
  return {
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    screenCount: dto.screenCount,
    previewScreen: dto.previewScreen ? mapScreenFromDto(dto.previewScreen, 0) : null,
  };
}

export function parseProjectResponse(value: unknown): ProjectResponseDTO {
  if (
    !isRecord(value) ||
    typeof value.schemaVersion !== 'number' ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.revision !== 'number' ||
    !Array.isArray(value.screens)
  ) {
    throw new ProjectError('unexpected', 'The backend returned an invalid project.');
  }
  return value as unknown as ProjectResponseDTO;
}

function parseProjectList(value: unknown): ProjectListResponseDTO {
  if (!isRecord(value) || !Array.isArray(value.projects)) {
    throw new ProjectError('unexpected', 'The backend returned an invalid project list.');
  }
  for (const summary of value.projects) {
    if (
      !isRecord(summary) ||
      typeof summary.id !== 'string' ||
      typeof summary.name !== 'string' ||
      typeof summary.createdAt !== 'string' ||
      typeof summary.updatedAt !== 'string' ||
      typeof summary.screenCount !== 'number'
    ) {
      throw new ProjectError('unexpected', 'The backend returned an invalid project summary.');
    }
  }
  return value as unknown as ProjectListResponseDTO;
}

export function isNotFoundError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  if (error.response?.status === 404) {
    return true;
  }
  const code = readEnvelope(error)?.error.code;
  return code === 'project_not_found' || code === 'app_data_not_found';
}

export function isStaleRevisionError(error: unknown): boolean {
  const code = readEnvelope(error)?.error.code;
  return code === 'stale_revision';
}

export function mapApiProjectError(error: unknown): ProjectError {
  if (error instanceof ProjectError) {
    return error;
  }
  if (!axios.isAxiosError(error)) {
    return new ProjectError('unexpected');
  }
  if (!error.response) {
    return new ProjectError('network', 'The backend could not be reached. Try again.');
  }
  const envelope = readEnvelope(error);
  const message = firstIssueMessage(envelope) ?? envelope?.error.message;
  switch (envelope?.error.code) {
    case 'invalid_project':
    case 'invalid_app_data':
    case 'validation_error':
      return new ProjectError('validation', message, envelope.error.details);
    case 'project_not_found':
    case 'app_data_not_found':
      return new ProjectError('not-found', message);
    case 'project_already_exists':
      return new ProjectError('already-exists', message);
    case 'stale_revision':
      return new ProjectError('stale-revision', message);
    case 'precondition_required':
      return new ProjectError('precondition-required', message);
    case 'session_required':
    case 'invalid_session':
      return new ProjectError('session-expired', message);
    case 'rate_limited':
      return new ProjectError('rate-limited', message);
    case 'auth_not_configured':
    case 'auth_provider_unavailable':
      return new ProjectError('unavailable', message);
    default:
      return new ProjectError('unexpected', message);
  }
}

function readEnvelope(error: unknown): ApiErrorEnvelope | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  return readApiErrorEnvelope(error.response?.data);
}
