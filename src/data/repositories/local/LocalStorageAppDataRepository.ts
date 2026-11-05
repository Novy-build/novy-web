import type {
  CreateCollectionInput,
  DataCollection,
  DataField,
  DataRecord,
  DataValue,
  UpdateCollectionInput,
} from '@domain/entities/appData';
import type { AppDataRepository } from '@domain/repositories/appData.repository';
import { validateFields, validateRecordValues } from '@domain/appData/validation';
import { generateId } from '@domain/ids';
import type { AppDataStoreDTO } from '../../dto/appData.dto';
import {
  mapCollectionFromDto,
  mapCollectionToDto,
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

  async listCollections(projectId: string): Promise<DataCollection[]> {
    await sleep(this.latencyMs);
    return this.read().collections
      .map(mapCollectionFromDto)
      .filter((collection) => collection.projectId === projectId)
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
    const now = this.now();
    const collection: DataCollection = {
      id: generateId('collection'),
      projectId,
      name,
      fields,
      createdAt: now,
      updatedAt: now,
    };
    const store = this.read();
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
    const updated: DataCollection = {
      ...previous,
      name,
      fields: input.fields.map((field) => ({ ...field })),
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
    return readJson<AppDataStoreDTO>(this.storage, APP_DATA_KEY) ?? { collections: [], records: [] };
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
