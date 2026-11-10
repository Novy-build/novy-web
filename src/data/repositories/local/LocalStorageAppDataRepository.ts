import type {
  CreateCollectionInput,
  CreateDatabaseInput,
  DataCollection,
  DataField,
  DataRecord,
  DataValue,
  ProjectDatabase,
  UpdateCollectionInput,
  UpdateDatabaseInput,
} from '@domain/entities/appData';
import { defaultRecordIdentifierKey, RECORD_IDENTIFIER_KEY_PATTERN } from '@domain/entities/appData';
import type { AppDataRepository } from '@domain/repositories/appData.repository';
import { validateFields, validateRecordValues } from '@domain/appData/validation';
import { generateId } from '@domain/ids';
import type { AppDataStoreDTO } from '../../dto/appData.dto';
import {
  mapCollectionFromDto,
  mapCollectionToDto,
  mapDatabaseFromDto,
  mapDatabaseToDto,
  mapRecordFromDto,
  mapRecordToDto,
} from '../../mappers/appData.mapper';
import { readJson, sleep, writeJson, type StorageLike } from '../../storage/storage';

const APP_DATA_KEY = 'novy.app-data.v1';
const DEFAULT_LATENCY_MS = 180;

export class LocalStorageAppDataRepository implements AppDataRepository {
  private readonly storage: StorageLike;
  private readonly latencyMs: number;
  private readonly now: () => Date;

  constructor(storage: StorageLike, options?: { latencyMs?: number; now?: () => Date }) {
    this.storage = storage;
    this.latencyMs = options?.latencyMs ?? DEFAULT_LATENCY_MS;
    this.now = options?.now ?? (() => new Date());
  }

  async listDatabases(projectId: string): Promise<ProjectDatabase[]> {
    await sleep(this.latencyMs);
    return this.read().databases
      .map(mapDatabaseFromDto)
      .filter((database) => database.projectId === projectId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async getDatabase(projectId: string, databaseId?: string): Promise<ProjectDatabase | null> {
    await sleep(this.latencyMs);
    const store = this.read();
    const dto = databaseId
      ? store.databases.find((database) => database.id === databaseId && database.projectId === projectId)
      : store.databases.find((database) => database.projectId === projectId);
    return dto ? mapDatabaseFromDto(dto) : null;
  }

  async createDatabase(projectId: string, input: CreateDatabaseInput): Promise<ProjectDatabase> {
    await sleep(this.latencyMs);
    const name = input.name.trim();
    if (!name) throw new Error('Database name is required.');
    const now = this.now();
    const database: ProjectDatabase = {
      id: generateId('database'),
      projectId,
      name,
      createdAt: now,
      updatedAt: now,
    };
    const store = this.read();
    store.databases.push(mapDatabaseToDto(database));
    this.write(store);
    return database;
  }

  async updateDatabase(
    projectId: string,
    databaseId: string,
    input: UpdateDatabaseInput,
  ): Promise<ProjectDatabase> {
    await sleep(this.latencyMs);
    const store = this.read();
    const index = store.databases.findIndex(
      (database) => database.id === databaseId && database.projectId === projectId,
    );
    if (index === -1) throw new Error('Database not found.');
    const name = input.name.trim();
    if (!name) throw new Error('Database name is required.');
    const previous = mapDatabaseFromDto(store.databases[index]!);
    const updated: ProjectDatabase = {
      ...previous,
      name,
      updatedAt: this.now(),
    };
    store.databases[index] = mapDatabaseToDto(updated);
    this.write(store);
    return updated;
  }

  async deleteDatabase(projectId: string, databaseId: string): Promise<void> {
    await sleep(this.latencyMs);
    const store = this.read();
    const exists = store.databases.some(
      (database) => database.id === databaseId && database.projectId === projectId,
    );
    if (!exists) throw new Error('Database not found.');
    const collectionIds = new Set(
      store.collections
        .filter((collection) => collection.projectId === projectId && collection.databaseId === databaseId)
        .map((collection) => collection.id),
    );
    store.databases = store.databases.filter(
      (database) => !(database.id === databaseId && database.projectId === projectId),
    );
    store.collections = store.collections.filter(
      (collection) => !(collection.databaseId === databaseId && collection.projectId === projectId),
    );
    store.records = store.records.filter(
      (record) => !(record.projectId === projectId && collectionIds.has(record.collectionId)),
    );
    this.write(store);
  }

  async listCollections(projectId: string, databaseId?: string): Promise<DataCollection[]> {
    await sleep(this.latencyMs);
    return this.read().collections
      .map(mapCollectionFromDto)
      .filter((collection) => collection.projectId === projectId && (databaseId === undefined || collection.databaseId === databaseId))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async getCollection(projectId: string, collectionId: string): Promise<DataCollection | null> {
    await sleep(this.latencyMs);
    const dto = this.read().collections.find(
      (collection) => collection.id === collectionId && collection.projectId === projectId,
    );
    return dto ? mapCollectionFromDto(dto) : null;
  }

  async createCollection(projectId: string, input: CreateCollectionInput): Promise<DataCollection> {
    await sleep(this.latencyMs);
    const name = input.name.trim();
    if (!name) throw new Error('Collection name is required.');
    const fields = (input.fields ?? [defaultField()]).map((field) => ({ ...field }));
    const fieldError = validateFields(fields);
    if (fieldError) throw new Error(fieldError);
    const identifier = input.identifier ?? {
      key: defaultRecordIdentifierKey(name),
      type: 'string' as const,
      generation: 'backend' as const,
    };
    const identifierError = validateRecordIdentifier(identifier.key, fields);
    if (identifierError) throw new Error(identifierError);
    const store = this.read();
    const database = input.databaseId
      ? store.databases.find((candidate) => candidate.id === input.databaseId && candidate.projectId === projectId)
      : store.databases.find((candidate) => candidate.projectId === projectId);
    if (!database) throw new Error('Create a database first.');
    const now = this.now();
    const collection: DataCollection = {
      id: generateId('collection'),
      projectId,
      databaseId: database.id,
      name,
      fields,
      identifier,
      createdAt: now,
      updatedAt: now,
    };
    store.collections.push(mapCollectionToDto(collection));
    this.write(store);
    return collection;
  }

  async updateCollection(
    projectId: string,
    collectionId: string,
    input: UpdateCollectionInput,
  ): Promise<DataCollection> {
    await sleep(this.latencyMs);
    const store = this.read();
    const index = store.collections.findIndex(
      (collection) => collection.id === collectionId && collection.projectId === projectId,
    );
    if (index === -1) throw new Error('Collection not found.');
    const name = input.name.trim();
    if (!name) throw new Error('Collection name is required.');
    const fieldError = validateFields(input.fields);
    if (fieldError) throw new Error(fieldError);
    const previous = mapCollectionFromDto(store.collections[index]!);
    const identifier = input.identifier ?? previous.identifier ?? {
      key: defaultRecordIdentifierKey(name),
      type: 'string' as const,
      generation: 'backend' as const,
    };
    const identifierError = validateRecordIdentifier(identifier.key, input.fields);
    if (identifierError) throw new Error(identifierError);
    const updated: DataCollection = {
      ...previous,
      name,
      fields: input.fields.map((field) => ({ ...field })),
      identifier: { ...identifier },
      updatedAt: this.now(),
    };
    const retained = new Set(updated.fields.map((field) => field.id));
    store.collections[index] = mapCollectionToDto(updated);
    store.records = store.records.map((record) => {
      if (record.projectId !== projectId || record.collectionId !== collectionId) return record;
      return {
        ...record,
        values: Object.fromEntries(Object.entries(record.values).filter(([fieldId]) => retained.has(fieldId))),
      };
    });
    this.write(store);
    return updated;
  }

  async deleteCollection(projectId: string, collectionId: string): Promise<void> {
    await sleep(this.latencyMs);
    const store = this.read();
    const exists = store.collections.some(
      (collection) => collection.id === collectionId && collection.projectId === projectId,
    );
    if (!exists) throw new Error('Collection not found.');
    store.collections = store.collections.filter(
      (collection) => !(collection.id === collectionId && collection.projectId === projectId),
    );
    store.records = store.records.filter(
      (record) => !(record.collectionId === collectionId && record.projectId === projectId),
    );
    this.write(store);
  }

  async listRecords(projectId: string, collectionId: string): Promise<DataRecord[]> {
    await sleep(this.latencyMs);
    this.requireCollection(this.read(), projectId, collectionId);
    return this.read().records
      .map(mapRecordFromDto)
      .filter((record) => record.projectId === projectId && record.collectionId === collectionId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async createRecord(
    projectId: string,
    collectionId: string,
    values: Record<string, DataValue>,
  ): Promise<DataRecord> {
    await sleep(this.latencyMs);
    const store = this.read();
    const collection = this.requireCollection(store, projectId, collectionId);
    const error = validateRecordValues(collection, values);
    if (error) throw new Error(error);
    const now = this.now();
    const record: DataRecord = {
      id: generateId('record'),
      projectId,
      collectionId,
      values: { ...values },
      createdAt: now,
      updatedAt: now,
    };
    store.records.push(mapRecordToDto(record));
    this.write(store);
    return record;
  }

  async updateRecord(
    projectId: string,
    collectionId: string,
    recordId: string,
    values: Record<string, DataValue>,
  ): Promise<DataRecord> {
    await sleep(this.latencyMs);
    const store = this.read();
    const collection = this.requireCollection(store, projectId, collectionId);
    const index = store.records.findIndex(
      (record) => record.id === recordId && record.projectId === projectId && record.collectionId === collectionId,
    );
    if (index === -1) throw new Error('Record not found.');
    const error = validateRecordValues(collection, values);
    if (error) throw new Error(error);
    const previous = mapRecordFromDto(store.records[index]!);
    const updated = { ...previous, values: { ...values }, updatedAt: this.now() };
    store.records[index] = mapRecordToDto(updated);
    this.write(store);
    return updated;
  }

  async deleteRecord(projectId: string, collectionId: string, recordId: string): Promise<void> {
    await sleep(this.latencyMs);
    const store = this.read();
    const exists = store.records.some(
      (record) => record.id === recordId && record.projectId === projectId && record.collectionId === collectionId,
    );
    if (!exists) throw new Error('Record not found.');
    store.records = store.records.filter(
      (record) => !(record.id === recordId && record.projectId === projectId && record.collectionId === collectionId),
    );
    this.write(store);
  }

  private requireCollection(store: AppDataStoreDTO, projectId: string, collectionId: string): DataCollection {
    const dto = store.collections.find(
      (collection) => collection.id === collectionId && collection.projectId === projectId,
    );
    if (!dto) throw new Error('Collection not found.');
    return mapCollectionFromDto(dto);
  }

  private read(): AppDataStoreDTO {
    const raw = readJson<Partial<AppDataStoreDTO> & { collections?: unknown[]; records?: unknown[] }>(
      this.storage,
      APP_DATA_KEY,
    );
    const store: AppDataStoreDTO = {
      databases: Array.isArray(raw?.databases) ? (raw.databases as AppDataStoreDTO['databases']) : [],
      collections: Array.isArray(raw?.collections) ? (raw.collections as AppDataStoreDTO['collections']) : [],
      records: Array.isArray(raw?.records) ? (raw.records as AppDataStoreDTO['records']) : [],
    };

    // Backward compatibility: projects that already contain collections receive
    // one database so existing component bindings and records keep working.
    const projectIds = new Set(store.collections.map((collection) => collection.projectId));
    for (const projectId of projectIds) {
      if (!store.databases.some((database) => database.projectId === projectId)) {
        const now = this.now().toISOString();
        store.databases.push({
          id: generateId('database'),
          projectId,
          name: 'Project database',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    for (const collection of store.collections) {
      if (!collection.databaseId) {
        const database = store.databases.find((candidate) => candidate.projectId === collection.projectId);
        if (database) collection.databaseId = database.id;
      }
    }

    this.write(store);
    return store;
  }

  private write(store: AppDataStoreDTO): void {
    writeJson(this.storage, APP_DATA_KEY, store);
  }
}

function defaultField(): DataField {
  return {
    id: generateId('field'),
    key: 'name',
    label: 'Name',
    type: 'text',
    required: false,
  };
}

function validateRecordIdentifier(key: string, fields: readonly DataField[]): string | null {
  if (!RECORD_IDENTIFIER_KEY_PATTERN.test(key)) {
    return 'Record ID name must start with a lowercase letter and contain only letters and numbers.';
  }
  if (fields.some((field) => field.key === key)) {
    return `Record ID name “${key}” conflicts with a collection field key.`;
  }
  return null;
}
