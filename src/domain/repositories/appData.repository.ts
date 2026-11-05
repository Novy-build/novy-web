import type {
  CreateCollectionInput,
  DataCollection,
  DataRecord,
  DataValue,
  UpdateCollectionInput,
} from '../entities/appData';

export interface AppDataRepository {
  listCollections(projectId: string): Promise<DataCollection[]>;
  getCollection(projectId: string, collectionId: string): Promise<DataCollection | null>;
  createCollection(projectId: string, input: CreateCollectionInput): Promise<DataCollection>;
  updateCollection(projectId: string, collectionId: string, input: UpdateCollectionInput): Promise<DataCollection>;
  deleteCollection(projectId: string, collectionId: string): Promise<void>;
  listRecords(projectId: string, collectionId: string): Promise<DataRecord[]>;
  createRecord(projectId: string, collectionId: string, values: Record<string, DataValue>): Promise<DataRecord>;
  updateRecord(projectId: string, collectionId: string, recordId: string, values: Record<string, DataValue>): Promise<DataRecord>;
  deleteRecord(projectId: string, collectionId: string, recordId: string): Promise<void>;
}
