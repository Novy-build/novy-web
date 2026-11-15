import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { ApiHttpClient } from '../../api/http';
import { ApiAppDataRepository } from './ApiAppDataRepository';

const NOW = '2026-11-11T12:00:00.000Z';

const DATABASE = {
  id: 'database_1',
  projectId: 'project_1',
  name: 'Data',
  createdAt: NOW,
  updatedAt: NOW,
};

const FIELD = {
  id: 'field_title',
  key: 'title',
  label: 'Title',
  type: 'text' as const,
  required: true,
};

const COLLECTION = {
  id: 'collection_1',
  projectId: 'project_1',
  databaseId: 'database_1',
  name: 'Notes',
  fields: [FIELD],
  identifier: { key: 'noteId', type: 'string' as const, generation: 'backend' as const },
  createdAt: NOW,
  updatedAt: NOW,
};

const RECORD = {
  id: 'record_1',
  projectId: 'project_1',
  collectionId: 'collection_1',
  values: { title: 'First' },
  createdAt: NOW,
  updatedAt: NOW,
};

function makeClient() {
  const get = vi.fn<ApiHttpClient['get']>();
  const post = vi.fn<ApiHttpClient['post']>();
  const put = vi.fn<ApiHttpClient['put']>();
  const patch = vi.fn<ApiHttpClient['patch']>();
  const remove = vi.fn<ApiHttpClient['delete']>();
  const client: ApiHttpClient = { get, post, put, patch, delete: remove };
  return { client, get, post, put, patch, remove };
}

function apiFailure(status: number, code: string): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data: { error: { code, message: 'Backend message.' } },
    status,
    statusText: 'Error',
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return error;
}

describe('ApiAppDataRepository', () => {
  it('lists databases under the project path', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: [DATABASE] });

    const databases = await new ApiAppDataRepository(client).listDatabases('project_1');

    expect(get).toHaveBeenCalledWith('/projects/project_1/databases');
    expect(databases).toEqual([{ ...DATABASE, createdAt: new Date(NOW), updatedAt: new Date(NOW) }]);
  });

  it('returns null when a collection is not accessible', async () => {
    const { client, get } = makeClient();
    get.mockRejectedValue(apiFailure(404, 'app_data_not_found'));

    await expect(
      new ApiAppDataRepository(client).getCollection('project_1', 'collection_missing'),
    ).resolves.toBeNull();
  });

  it('creates a collection with field and identifier contracts', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue({ status: 201, data: COLLECTION });

    const collection = await new ApiAppDataRepository(client).createCollection('project_1', {
      name: 'Notes',
      databaseId: 'database_1',
      fields: [FIELD],
      identifier: COLLECTION.identifier,
    });

    expect(post).toHaveBeenCalledWith('/projects/project_1/collections', {
      name: 'Notes',
      databaseId: 'database_1',
      fields: [FIELD],
      identifier: COLLECTION.identifier,
    });
    expect(collection.id).toBe('collection_1');
    expect(collection.identifier).toEqual(COLLECTION.identifier);
    expect(collection.createdAt).toEqual(new Date(NOW));
  });

  it('creates a record under its collection', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue({ status: 201, data: RECORD });

    const record = await new ApiAppDataRepository(client).createRecord(
      'project_1',
      'collection_1',
      { title: 'First' },
    );

    expect(post).toHaveBeenCalledWith('/projects/project_1/collections/collection_1/records', {
      values: { title: 'First' },
    });
    expect(record.values).toEqual({ title: 'First' });
  });

  it('exports a complete project data store for local import', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({
      status: 200,
      data: {
        databases: [DATABASE],
        collections: [COLLECTION],
        recordsByCollection: { collection_1: [RECORD] },
      },
    });

    const store = await new ApiAppDataRepository(client).exportProjectData('project_1');

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith('/projects/project_1/app-data');
    expect(store.databases.map((database) => database.id)).toEqual(['database_1']);
    expect(store.collections.map((collection) => collection.id)).toEqual(['collection_1']);
    expect(store.records.map((record) => record.id)).toEqual(['record_1']);
  });

  it('deduplicates concurrent project data loads', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({
      status: 200,
      data: {
        databases: [DATABASE],
        collections: [COLLECTION],
        recordsByCollection: { collection_1: [RECORD] },
      },
    });
    const repository = new ApiAppDataRepository(client);

    await Promise.all([
      repository.exportProjectData('project_1'),
      repository.exportProjectData('project_1'),
    ]);

    expect(get).toHaveBeenCalledOnce();
  });

  it('rejects a malformed project data snapshot', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { databases: [], collections: [] } });

    await expect(
      new ApiAppDataRepository(client).exportProjectData('project_1'),
    ).rejects.toMatchObject({ code: 'unexpected' });
  });
});
