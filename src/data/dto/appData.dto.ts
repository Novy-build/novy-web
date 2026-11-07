import type { DataFieldType, DataValue } from '@domain/entities/appData';

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
