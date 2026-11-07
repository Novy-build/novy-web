export type DataFieldType = 'text' | 'number' | 'boolean' | 'date';
export type DataValue = string | number | boolean | null;

export interface ProjectDatabase {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDatabaseInput {
  name: string;
}

export interface UpdateDatabaseInput {
  name: string;
}

export interface DataField {
  id: string;
  key: string;
  label: string;
  type: DataFieldType;
  required: boolean;
}

export interface DataCollection {
  id: string;
  projectId: string;
  databaseId: string;
  name: string;
  fields: DataField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRecord {
  id: string;
  projectId: string;
  collectionId: string;
  values: Record<string, DataValue>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionInput {
  name: string;
  databaseId?: string;
  fields?: DataField[];
}

export interface UpdateCollectionInput {
  name: string;
  fields: DataField[];
}
