import type {
  AppDataStore,
  CreateCollectionInput,
  CreateDatabaseInput,
  DataCollection,
  DataRecord,
  DataValue,
  ProjectDatabase,
  UpdateCollectionInput,
  UpdateDatabaseInput,
} from '@domain/entities/appData';
import { ProjectError } from '@domain/errors/ProjectError';
import type { AppDataRepository } from '@domain/repositories/appData.repository';
import { isRecord, type ApiHttpClient } from '../../api/http';
import type {
  AppDataSnapshotDTO,
  DataCollectionDTO,
  DataRecordDTO,
  ProjectDatabaseDTO,
} from '../../dto/appData.dto';
import {
  mapCollectionFromDto,
  mapCollectionToDto,
  mapDatabaseFromDto,
  mapDatabaseToDto,
  mapRecordFromDto,
  mapRecordToDto,
} from '../../mappers/appData.mapper';
import {
  isNotFoundError,
  mapApiProjectError,
} from './ApiProjectRepository';

const PROJECTS_BASE = '/projects';

/** Backend-backed project app-data persistence. */
export class ApiAppDataRepository implements AppDataRepository {
  private readonly client: ApiHttpClient;
  private readonly databaseRequests = new Map<string, Promise<ProjectDatabase[]>>();
  private readonly collectionRequests = new Map<string, Promise<DataCollection[]>>();
  private readonly recordRequests = new Map<string, Promise<DataRecord[]>>();
  private readonly snapshotRequests = new Map<string, Promise<AppDataStore>>();

  constructor(client: ApiHttpClient) {
    this.client = client;
  }

  async listDatabases(projectId: string): Promise<ProjectDatabase[]> {
    return deduplicate(this.databaseRequests, projectId, () => this.loadDatabases(projectId));
  }

  private async loadDatabases(projectId: string): Promise<ProjectDatabase[]> {
    try {
      const response = await this.client.get(databasesPath(projectId));
      return parseArray<ProjectDatabaseDTO>(response.data, 'database list').map(
        mapDatabaseFromDto,
      );
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async getDatabase(projectId: string, databaseId?: string): Promise<ProjectDatabase | null> {
    const databases = await this.listDatabases(projectId);
    if (databaseId === undefined) {
      return databases[0] ?? null;
    }
    return databases.find((database) => database.id === databaseId) ?? null;
  }

  async createDatabase(
    projectId: string,
    input: CreateDatabaseInput,
  ): Promise<ProjectDatabase> {
    try {
      const response = await this.client.post(databasesPath(projectId), {
        name: input.name,
      });
      return mapDatabaseFromDto(parseObject<ProjectDatabaseDTO>(response.data, 'database'));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async updateDatabase(
    projectId: string,
    databaseId: string,
    input: UpdateDatabaseInput,
  ): Promise<ProjectDatabase> {
    try {
      const response = await this.client.patch(
        `${databasesPath(projectId)}/${encodeURIComponent(databaseId)}`,
        { name: input.name },
      );
      return mapDatabaseFromDto(parseObject<ProjectDatabaseDTO>(response.data, 'database'));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async deleteDatabase(projectId: string, databaseId: string): Promise<void> {
    try {
      await this.client.delete(
        `${databasesPath(projectId)}/${encodeURIComponent(databaseId)}`,
      );
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async listCollections(
    projectId: string,
    databaseId?: string,
  ): Promise<DataCollection[]> {
    const requestKey = `${projectId}:${databaseId ?? ''}`;
    return deduplicate(this.collectionRequests, requestKey, () =>
      this.loadCollections(projectId, databaseId),
    );
  }

  private async loadCollections(
    projectId: string,
    databaseId?: string,
  ): Promise<DataCollection[]> {
    try {
      const response = await this.client.get(collectionsPath(projectId), {
        ...(databaseId ? { params: { databaseId } } : {}),
      });
      return parseArray<DataCollectionDTO>(response.data, 'collection list').map(
        mapCollectionFromDto,
      );
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async getCollection(
    projectId: string,
    collectionId: string,
  ): Promise<DataCollection | null> {
    try {
      const response = await this.client.get(
        `${collectionsPath(projectId)}/${encodeURIComponent(collectionId)}`,
      );
      return mapCollectionFromDto(parseObject<DataCollectionDTO>(response.data, 'collection'));
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw mapApiProjectError(error);
    }
  }

  async createCollection(
    projectId: string,
    input: CreateCollectionInput,
  ): Promise<DataCollection> {
    try {
      const response = await this.client.post(collectionsPath(projectId), {
        name: input.name,
        ...(input.databaseId ? { databaseId: input.databaseId } : {}),
        fields: (input.fields ?? []).map((field) => ({ ...field })),
        ...(input.identifier ? { identifier: { ...input.identifier } } : {}),
      });
      return mapCollectionFromDto(parseObject<DataCollectionDTO>(response.data, 'collection'));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async updateCollection(
    projectId: string,
    collectionId: string,
    input: UpdateCollectionInput,
  ): Promise<DataCollection> {
    try {
      const response = await this.client.put(
        `${collectionsPath(projectId)}/${encodeURIComponent(collectionId)}`,
        {
          name: input.name,
          fields: input.fields.map((field) => ({ ...field })),
          ...(input.identifier ? { identifier: { ...input.identifier } } : {}),
        },
      );
      return mapCollectionFromDto(parseObject<DataCollectionDTO>(response.data, 'collection'));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async deleteCollection(projectId: string, collectionId: string): Promise<void> {
    try {
      await this.client.delete(
        `${collectionsPath(projectId)}/${encodeURIComponent(collectionId)}`,
      );
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async listRecords(projectId: string, collectionId: string): Promise<DataRecord[]> {
    const requestKey = `${projectId}:${collectionId}`;
    return deduplicate(this.recordRequests, requestKey, () =>
      this.loadRecords(projectId, collectionId),
    );
  }

  private async loadRecords(projectId: string, collectionId: string): Promise<DataRecord[]> {
    try {
      const response = await this.client.get(recordsPath(projectId, collectionId));
      return parseArray<DataRecordDTO>(response.data, 'record list').map(mapRecordFromDto);
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async createRecord(
    projectId: string,
    collectionId: string,
    values: Record<string, DataValue>,
  ): Promise<DataRecord> {
    try {
      const response = await this.client.post(recordsPath(projectId, collectionId), {
        values: { ...values },
      });
      return mapRecordFromDto(parseObject<DataRecordDTO>(response.data, 'record'));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async updateRecord(
    projectId: string,
    collectionId: string,
    recordId: string,
    values: Record<string, DataValue>,
  ): Promise<DataRecord> {
    try {
      const response = await this.client.put(
        `${recordsPath(projectId, collectionId)}/${encodeURIComponent(recordId)}`,
        { values: { ...values } },
      );
      return mapRecordFromDto(parseObject<DataRecordDTO>(response.data, 'record'));
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async deleteRecord(
    projectId: string,
    collectionId: string,
    recordId: string,
  ): Promise<void> {
    try {
      await this.client.delete(
        `${recordsPath(projectId, collectionId)}/${encodeURIComponent(recordId)}`,
      );
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }

  async exportProjectData(projectId: string): Promise<AppDataStore> {
    return deduplicate(this.snapshotRequests, projectId, () => this.loadProjectData(projectId));
  }

  private async loadProjectData(projectId: string): Promise<AppDataStore> {
    try {
      const response = await this.client.get(appDataPath(projectId));
      const snapshot = parseAppDataSnapshot(response.data);
      return {
        databases: snapshot.databases.map(mapDatabaseFromDto),
        collections: snapshot.collections.map(mapCollectionFromDto),
        records: Object.values(snapshot.recordsByCollection).flat().map(mapRecordFromDto),
      };
    } catch (error) {
      throw mapApiProjectError(error);
    }
  }
}

async function deduplicate<T>(
  requests: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const current = requests.get(key);
  if (current) return current;
  const request = load();
  requests.set(key, request);
  try {
    return await request;
  } finally {
    requests.delete(key);
  }
}

function appDataPath(projectId: string): string {
  return `${PROJECTS_BASE}/${encodeURIComponent(projectId)}/app-data`;
}

function databasesPath(projectId: string): string {
  return `${PROJECTS_BASE}/${encodeURIComponent(projectId)}/databases`;
}

function collectionsPath(projectId: string): string {
  return `${PROJECTS_BASE}/${encodeURIComponent(projectId)}/collections`;
}

function recordsPath(projectId: string, collectionId: string): string {
  return `${collectionsPath(projectId)}/${encodeURIComponent(collectionId)}/records`;
}

function parseArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) {
    throw new ProjectError('unexpected', `The backend returned an invalid ${label}.`);
  }
  return value as T[];
}

function parseAppDataSnapshot(value: unknown): AppDataSnapshotDTO {
  if (
    !isRecord(value) ||
    !Array.isArray(value.databases) ||
    !Array.isArray(value.collections) ||
    !isRecord(value.recordsByCollection) ||
    Object.values(value.recordsByCollection).some((records) => !Array.isArray(records))
  ) {
    throw new ProjectError('unexpected', 'The backend returned invalid project data.');
  }
  return value as unknown as AppDataSnapshotDTO;
}

function parseObject<T>(value: unknown, label: string): T {
  if (!isRecord(value)) {
    throw new ProjectError('unexpected', `The backend returned an invalid ${label}.`);
  }
  return value as T;
}

export function mapAppDataStoreToDto(store: AppDataStore) {
  return {
    databases: store.databases.map(mapDatabaseToDto),
    collections: store.collections.map(mapCollectionToDto),
    records: store.records.map(mapRecordToDto),
  };
}
