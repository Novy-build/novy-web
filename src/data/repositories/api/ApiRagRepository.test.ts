import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { ProjectError } from '@domain/errors/ProjectError';
import type { ApiHttpClient } from '../../api/http';
import { ApiRagRepository } from './ApiRagRepository';

const PROFILE = {
  id: 'ollama-embedding',
  name: 'Ollama Embeddings',
  capability: 'embedding',
  provider: 'ollama',
  models: ['embedding-test'],
  defaultModel: 'embedding-test',
  location: 'local',
  costWarning: false,
  usageNote: 'Local.',
  available: true,
  embeddingDimensions: 256,
};

const FILE_SOURCE = {
  id: 'rag_file_1',
  projectId: 'project_1',
  filename: 'notes.txt',
  mediaType: 'text/plain',
  contentHash: 'abc',
  createdAt: '2026-11-16T00:00:00Z',
};

function makeClient() {
  const get = vi.fn<ApiHttpClient['get']>();
  const post = vi.fn<ApiHttpClient['post']>();
  const put = vi.fn<ApiHttpClient['put']>();
  const patch = vi.fn<ApiHttpClient['patch']>();
  const remove = vi.fn<ApiHttpClient['delete']>();
  const client: ApiHttpClient = { get, post, put, patch, delete: remove };
  return { client, get, post, remove };
}

function apiFailure(code: string): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data: { error: { code, message: 'Backend message.' } },
    status: 422,
    statusText: 'Error',
    headers: {},
    config: { headers: {} },
  } as AxiosError['response'];
  return error;
}

describe('ApiRagRepository', () => {
  it('lists connection profiles without a capability filter', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { profiles: [PROFILE] } });

    const profiles = await new ApiRagRepository(client).listProfiles();

    expect(get).toHaveBeenCalledWith('/runtime-profiles');
    expect(profiles[0]?.id).toBe('ollama-embedding');
    expect(profiles[0]?.embeddingDimensions).toBe(256);
  });

  it('filters profiles by capability', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { profiles: [PROFILE] } });

    await new ApiRagRepository(client).listProfiles('chat');

    expect(get).toHaveBeenCalledWith('/runtime-profiles?capability=chat');
  });

  it('lists project file sources', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { files: [FILE_SOURCE] } });

    const files = await new ApiRagRepository(client).listFileSources('project_1');

    expect(get).toHaveBeenCalledWith('/projects/project_1/rag/files');
    expect(files[0]?.filename).toBe('notes.txt');
  });

  it('uploads a file source as multipart form data', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue({ status: 201, data: FILE_SOURCE });
    const file = new File(['alpha'], 'notes.txt', { type: 'text/plain' });

    const source = await new ApiRagRepository(client).uploadFileSource('project_1', file);

    expect(post).toHaveBeenCalledWith('/projects/project_1/rag/files', expect.any(FormData));
    expect(source.id).toBe('rag_file_1');
  });

  it('deletes a file source', async () => {
    const { client, remove } = makeClient();
    remove.mockResolvedValue({ status: 204, data: null });

    await new ApiRagRepository(client).deleteFileSource('project_1', 'rag_file_1');

    expect(remove).toHaveBeenCalledWith('/projects/project_1/rag/files/rag_file_1');
  });

  it('maps an unsupported source to a not-found failure', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(apiFailure('rag_source_unsupported'));

    await expect(
      new ApiRagRepository(client).uploadFileSource('project_1', new File(['x'], 'x.bin')),
    ).rejects.toMatchObject({ code: 'unexpected', message: 'Backend message.' });
  });

  it('maps a missing session to an expired session failure', async () => {
    const { client, get } = makeClient();
    get.mockRejectedValue(apiFailure('invalid_session'));

    await expect(new ApiRagRepository(client).listProfiles()).rejects.toBeInstanceOf(ProjectError);
    await expect(new ApiRagRepository(client).listProfiles()).rejects.toMatchObject({
      code: 'session-expired',
    });
  });
});
