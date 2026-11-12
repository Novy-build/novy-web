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
} from '../entities/appData';

export interface AppDataRepository {
  listDatabases(projectId: string): Promise<ProjectDatabase[]>;
  getDatabase(projectId: string, databaseId?: string): Promise<ProjectDatabase | null>;
  createDatabase(projectId: string, input: CreateDatabaseInput): Promise<ProjectDatabase>;
  updateDatabase(projectId: string, databaseId: string, input: UpdateDatabaseInput): Promise<ProjectDatabase>;
  deleteDatabase(projectId: string, databaseId: string): Promise<void>;

  listCollections(projectId: string, databaseId?: string): Promise<DataCollection[]>;
  getCollection(projectId: string, collectionId: string): Promise<DataCollection | null>;
  createCollection(projectId: string, input: CreateCollectionInput): Promise<DataCollection>;
  updateCollection(projectId: string, collectionId: string, input: UpdateCollectionInput): Promise<DataCollection>;
  deleteCollection(projectId: string, collectionId: string): Promise<void>;
  listRecords(projectId: string, collectionId: string): Promise<DataRecord[]>;
  createRecord(projectId: string, collectionId: string, values: Record<string, DataValue>): Promise<DataRecord>;
  updateRecord(projectId: string, collectionId: string, recordId: string, values: Record<string, DataValue>): Promise<DataRecord>;
  deleteRecord(projectId: string, collectionId: string, recordId: string): Promise<void>;

  /** Reads every database, collection, and record for local-project import. */
  exportProjectData(projectId: string): Promise<AppDataStore>;
}
