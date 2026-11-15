import type { DataFieldType, DataValue, RecordIdentifier } from '@domain/entities/appData';

export interface DataFieldDTO {
  id: string;
  key: string;
  label: string;
  type: DataFieldType;
  required: boolean;
}

export interface ProjectDatabaseDTO {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataCollectionDTO {
  id: string;
  projectId: string;
  databaseId: string;
  name: string;
  fields: DataFieldDTO[];
  identifier?: RecordIdentifier;
  createdAt: string;
  updatedAt: string;
}

export interface DataRecordDTO {
  id: string;
  projectId: string;
  collectionId: string;
  values: Record<string, DataValue>;
  createdAt: string;
  updatedAt: string;
}

export interface AppDataStoreDTO {
  databases: ProjectDatabaseDTO[];
  collections: DataCollectionDTO[];
  records: DataRecordDTO[];
}

/** Backend snapshot optimized for opening the editor data panel in one request. */
export interface AppDataSnapshotDTO {
  databases: ProjectDatabaseDTO[];
  collections: DataCollectionDTO[];
  recordsByCollection: Record<string, DataRecordDTO[]>;
}
