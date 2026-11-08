export type DataFieldType = 'text' | 'number' | 'boolean' | 'date';
export type DataValue = string | number | boolean | null;

/** Runtime context supplied to widgets rendered inside one repeated ListView item. */
export interface ListItemContext {
  listViewId: string;
  itemId: string;
  values: Readonly<Record<string, DataValue>>;
}

export type ListItemPlacement = 'append' | 'prepend';

/** One session-only item layered around a static ListView's persisted/runtime baseline. */
export interface LocalListItemAddition {
  itemId: string;
  placement: ListItemPlacement;
  values: Readonly<Record<string, DataValue>>;
}

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
