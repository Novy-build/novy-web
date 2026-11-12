import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '@domain/entities/template';
import type { ApiHttpClient } from '../../api/http';
import { createLocalRepositories } from '../local';
import { ApiProjectImportRepository } from './ApiProjectImportRepository';

const NOW = '2026-11-11T12:00:00.000Z';

const TEMPLATE: Template = {
  id: 'template_blank',
  name: 'Blank',
  description: 'Empty screen',
  screens: [{ id: 'screen_blank', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] }],
};

function makeClient() {
  const get = vi.fn<ApiHttpClient['get']>();
  const post = vi.fn<ApiHttpClient['post']>();
  const put = vi.fn<ApiHttpClient['put']>();
  const patch = vi.fn<ApiHttpClient['patch']>();
  const remove = vi.fn<ApiHttpClient['delete']>();
  const client: ApiHttpClient = { get, post, put, patch, delete: remove };
  return { client, get, post };
}

function projectResponse(projectId: string) {
  return {
    status: 201,
    data: {
      schemaVersion: 13,
      id: projectId,
      name: 'Local app',
      createdAt: NOW,
      updatedAt: NOW,
      screens: [],
      revision: 1,
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('ApiProjectImportRepository', () => {
  it('lists local projects that are not already remote or imported', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const project = await repositories.projects.createProject('Local app', TEMPLATE);
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { projects: [] } });

    const repository = new ApiProjectImportRepository(
      client,
      repositories.projects,
      repositories.appData,
      window.localStorage,
    );

    const importable = await repository.listImportableProjects();

    expect(importable.map((summary) => summary.id)).toEqual([project.id]);
  });

  it('filters local projects whose ID already exists on the server', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const project = await repositories.projects.createProject('Local app', TEMPLATE);
    const { client, get } = makeClient();
    get.mockResolvedValue({
      status: 200,
      data: {
        projects: [
          {
            id: project.id,
            name: 'Local app',
            createdAt: NOW,
            updatedAt: NOW,
            screenCount: 1,
            previewScreen: null,
          },
        ],
      },
    });

    const repository = new ApiProjectImportRepository(
      client,
      repositories.projects,
      repositories.appData,
      window.localStorage,
    );

    await expect(repository.listImportableProjects()).resolves.toEqual([]);
  });

  it('uploads the project and its app data, then marks it imported', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const project = await repositories.projects.createProject('Local app', TEMPLATE);
    const database = await repositories.appData.createDatabase(project.id, { name: 'Data' });
    const collection = await repositories.appData.createCollection(project.id, {
      name: 'Notes',
      databaseId: database.id,
      fields: [
        { id: 'field_title', key: 'title', label: 'Title', type: 'text', required: true },
      ],
    });
    await repositories.appData.createRecord(project.id, collection.id, { field_title: 'First' });

    const { client, get, post } = makeClient();
    get.mockResolvedValue({ status: 200, data: { projects: [] } });
    post.mockResolvedValue(projectResponse(project.id));

    const repository = new ApiProjectImportRepository(
      client,
      repositories.projects,
      repositories.appData,
      window.localStorage,
    );

    const imported = await repository.importProject(project.id);

    expect(imported.id).toBe(project.id);
    const body = post.mock.calls[0]![1] as {
      project: { id: string; schemaVersion: number };
      appData: {
        databases: Array<{ id: string }>;
        collections: Array<{ id: string }>;
        records: Array<{ values: Record<string, unknown> }>;
      };
    };
    expect(post.mock.calls[0]![0]).toBe('/projects/import');
    expect(body.project.id).toBe(project.id);
    expect(body.project.schemaVersion).toBe(13);
    expect(body.appData.databases.map((entry) => entry.id)).toEqual([database.id]);
    expect(body.appData.collections.map((entry) => entry.id)).toEqual([collection.id]);
    expect(body.appData.records.map((entry) => entry.values)).toEqual([
      { field_title: 'First' },
    ]);

    // The browser copy survives the upload and is not offered a second time.
    expect((await repositories.projects.listProjects()).map((entry) => entry.id)).toEqual([
      project.id,
    ]);
    expect(window.localStorage.getItem('novy.imported-projects.v1')).toContain(project.id);
    await expect(repository.listImportableProjects()).resolves.toEqual([]);
  });

  it('keeps the local project when the upload fails', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const project = await repositories.projects.createProject('Local app', TEMPLATE);
    const { client, post } = makeClient();
    post.mockRejectedValue(new Error('offline'));

    const repository = new ApiProjectImportRepository(
      client,
      repositories.projects,
      repositories.appData,
      window.localStorage,
    );

    await expect(repository.importProject(project.id)).rejects.toMatchObject({
      name: 'ProjectError',
    });
    expect(window.localStorage.getItem('novy.imported-projects.v1')).toBeNull();
    expect((await repositories.projects.listProjects()).map((entry) => entry.id)).toEqual([
      project.id,
    ]);
  });
});
