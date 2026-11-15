import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { Template } from '@domain/entities/template';
import { ProjectError } from '@domain/errors/ProjectError';
import type { ApiHttpClient, ApiHttpResponse } from '../../api/http';
import { ApiProjectRepository } from './ApiProjectRepository';

const NOW = '2026-11-11T12:00:00.000Z';

function makeClient() {
  const get = vi.fn<ApiHttpClient['get']>();
  const post = vi.fn<ApiHttpClient['post']>();
  const put = vi.fn<ApiHttpClient['put']>();
  const patch = vi.fn<ApiHttpClient['patch']>();
  const remove = vi.fn<ApiHttpClient['delete']>();
  const client: ApiHttpClient = { get, post, put, patch, delete: remove };
  return { client, get, post, put, patch, remove };
}

function projectResponse(overrides: Record<string, unknown> = {}): ApiHttpResponse {
  return {
    status: 200,
    data: {
      schemaVersion: 13,
      id: 'project_1',
      name: 'My app',
      createdAt: NOW,
      updatedAt: NOW,
      screens: [],
      revision: 1,
      ...overrides,
    },
  };
}

function apiFailure(status: number, code: string, details?: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data: { error: { code, message: 'Backend message.', details } },
    status,
    statusText: 'Error',
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return error;
}

const BLANK_TEMPLATE: Template = {
  id: 'template_blank',
  name: 'Blank',
  description: 'Empty screen',
  projectType: 'app',
  screens: [{ id: 'screen_blank', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] }],
};

describe('ApiProjectRepository', () => {
  it('lists owner-scoped project summaries', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({
      status: 200,
      data: {
        projects: [
          {
            id: 'project_1',
            name: 'My app',
            createdAt: NOW,
            updatedAt: NOW,
            screenCount: 2,
            previewScreen: null,
          },
        ],
      },
    });

    const summaries = await new ApiProjectRepository(client).listProjects();

    expect(get).toHaveBeenCalledWith('/projects');
    expect(summaries).toEqual([
      {
        id: 'project_1',
        name: 'My app',
        projectType: 'app',
        createdAt: new Date(NOW),
        updatedAt: new Date(NOW),
        screenCount: 2,
        previewScreen: null,
      },
    ]);
  });

  it('creates a project with the versioned template payload and adopts its revision', async () => {
    const { client, post, put } = makeClient();
    post.mockResolvedValue(projectResponse({ revision: 2 }));
    put.mockResolvedValue(projectResponse({ revision: 3 }));

    const repository = new ApiProjectRepository(client);
    const project = await repository.createProject('My app', BLANK_TEMPLATE);

    expect(post).toHaveBeenCalledWith('/projects', {
      name: 'My app',
      template: {
        id: 'template_blank',
        name: 'Blank',
        description: 'Empty screen',
        projectType: 'app',
        screens: BLANK_TEMPLATE.screens,
      },
    });
    expect(project.name).toBe('My app');

    await repository.saveProjectDocument(project.id, { screens: [] });

    expect(put).toHaveBeenCalledWith(
      '/projects/project_1/document',
      { schemaVersion: 13, screens: [] },
      { headers: { 'If-Match': '"2"' } },
    );
  });

  it('refreshes the revision after a stale save and reports the conflict', async () => {
    const { client, get, put } = makeClient();
    get
      .mockResolvedValueOnce(projectResponse({ revision: 3 }))
      .mockResolvedValueOnce(projectResponse({ revision: 4 }));
    put
      .mockRejectedValueOnce(apiFailure(409, 'stale_revision'))
      .mockResolvedValueOnce(projectResponse({ revision: 5 }));

    const repository = new ApiProjectRepository(client);

    await expect(
      repository.saveProjectDocument('project_1', { screens: [] }),
    ).rejects.toMatchObject({ name: 'ProjectError', code: 'stale-revision' });

    await repository.saveProjectDocument('project_1', { screens: [] });

    expect(put).toHaveBeenLastCalledWith(
      '/projects/project_1/document',
      { schemaVersion: 13, screens: [] },
      { headers: { 'If-Match': '"4"' } },
    );
  });

  it('returns null when the project is not accessible', async () => {
    const { client, get } = makeClient();
    get.mockRejectedValue(apiFailure(404, 'project_not_found'));

    await expect(new ApiProjectRepository(client).getProject('project_missing')).resolves.toBeNull();
  });

  it('reuses a recently loaded project during navigation', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue(projectResponse());
    const repository = new ApiProjectRepository(client);

    const first = await repository.getProject('project_1');
    const second = await repository.getProject('project_1');

    expect(first).toBe(second);
    expect(get).toHaveBeenCalledOnce();
  });

  it('deduplicates a preload and editor load in flight', async () => {
    const { client, get } = makeClient();
    let resolve!: (response: ApiHttpResponse) => void;
    get.mockReturnValue(new Promise((next) => { resolve = next; }));
    const repository = new ApiProjectRepository(client);

    const preload = repository.getProject('project_1');
    const editorLoad = repository.getProject('project_1');
    resolve(projectResponse());

    await expect(Promise.all([preload, editorLoad])).resolves.toHaveLength(2);
    expect(get).toHaveBeenCalledOnce();
  });

  it('reuses a recently loaded project list', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { projects: [] } });
    const repository = new ApiProjectRepository(client);

    await repository.listProjects();
    await repository.listProjects();

    expect(get).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent project-list loads', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { projects: [] } });
    const repository = new ApiProjectRepository(client);

    await Promise.all([repository.listProjects(), repository.listProjects()]);

    expect(get).toHaveBeenCalledOnce();
  });

  it('maps validation failures to a typed project error', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(
      apiFailure(422, 'invalid_project', {
        issues: [{ path: ['screens'], message: 'A project needs at least one screen.' }],
      }),
    );

    await expect(
      new ApiProjectRepository(client).createProject('Broken', BLANK_TEMPLATE),
    ).rejects.toMatchObject({
      name: 'ProjectError',
      code: 'validation',
      message: 'A project needs at least one screen.',
    } satisfies Partial<ProjectError>);
  });

  it('reports an unreachable backend as a network error', async () => {
    const { client, get } = makeClient();
    get.mockRejectedValue(new AxiosError('Network Error'));

    await expect(new ApiProjectRepository(client).listProjects()).rejects.toMatchObject({
      name: 'ProjectError',
      code: 'network',
    } satisfies Partial<ProjectError>);
  });

  it('reports a slow backend as a timeout instead of an unreachable one', async () => {
    const { client, get } = makeClient();
    const timeoutError = new AxiosError('timeout of 30000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    get.mockRejectedValue(timeoutError);

    await expect(new ApiProjectRepository(client).listProjects()).rejects.toMatchObject({
      name: 'ProjectError',
      code: 'timeout',
      message: 'The backend took too long to respond. Try again.',
    } satisfies Partial<ProjectError>);
  });
});
