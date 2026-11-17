import type { RagFileSource, RagProfile } from '@domain/entities/rag';
import { ProjectError } from '@domain/errors/ProjectError';
import type { RagRepository } from '@domain/repositories/rag.repository';
import { isRecord, readApiErrorEnvelope, type ApiHttpClient } from '../../api/http';
import {
  mapRagFileSourceFromDto,
  mapRagFileSourceListFromDto,
  mapRagProfileListFromDto,
} from '../../mappers/rag.mapper';

const PROFILES_PATH = '/runtime-profiles';

/** Backend-backed generated-app RAG profiles and file sources. */
export class ApiRagRepository implements RagRepository {
  private readonly client: ApiHttpClient;

  constructor(client: ApiHttpClient) {
    this.client = client;
  }

  async listProfiles(capability?: string): Promise<RagProfile[]> {
    const query = capability ? `?capability=${encodeURIComponent(capability)}` : '';
    try {
      const response = await this.client.get(`${PROFILES_PATH}${query}`);
      return mapRagProfileListFromDto(response.data);
    } catch (error) {
      throw mapRagError(error);
    }
  }

  async listFileSources(projectId: string): Promise<RagFileSource[]> {
    try {
      const response = await this.client.get(filesPath(projectId));
      return mapRagFileSourceListFromDto(response.data);
    } catch (error) {
      throw mapRagError(error);
    }
  }

  async uploadFileSource(projectId: string, file: File): Promise<RagFileSource> {
    const body = new FormData();
    body.append('file', file, file.name);
    try {
      const response = await this.client.post(filesPath(projectId), body);
      const source = mapRagFileSourceFromDto(response.data);
      if (!source) {
        throw new ProjectError('unexpected', 'The backend returned an invalid RAG file source.');
      }
      return source;
    } catch (error) {
      throw mapRagError(error);
    }
  }

  async deleteFileSource(projectId: string, sourceId: string): Promise<void> {
    try {
      await this.client.delete(`${filesPath(projectId)}/${encodeURIComponent(sourceId)}`);
    } catch (error) {
      throw mapRagError(error);
    }
  }
}

function filesPath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/rag/files`;
}

function mapRagError(error: unknown): ProjectError {
  const envelope = readApiErrorEnvelope((error as { response?: { data?: unknown } })?.response?.data);
  if (!envelope) {
    return new ProjectError('network', 'The RAG service could not be reached.');
  }
  const code = envelope.error.code;
  if (code === 'not_found' || code === 'project_not_found' || code === 'rag_source_not_found') {
    return new ProjectError('not-found', envelope.error.message);
  }
  if (code === 'invalid_session' || code === 'session_required') {
    return new ProjectError('session-expired', envelope.error.message);
  }
  if (code === 'forbidden') {
    return new ProjectError('unavailable', envelope.error.message);
  }
  return new ProjectError('unexpected', envelope.error.message);
}

export function isRagErrorPayload(value: unknown): boolean {
  return isRecord(value);
}
