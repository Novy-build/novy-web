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

/** Public/backend name for the immutable record identity generated under the hood. */
export interface RecordIdentifier {
  key: string;
  type: 'string';
  generation: 'backend';
}

export const RECORD_IDENTIFIER_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/;

export function defaultRecordIdentifierKey(collectionName: string): string {
  const words = collectionName.trim().match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 0) return 'recordId';
  const lastIndex = words.length - 1;
  const last = words[lastIndex]!.toLowerCase();
  words[lastIndex] = last.endsWith('ies') && last.length > 3
    ? `${last.slice(0, -3)}y`
    : last.endsWith('s') && !last.endsWith('ss') && last.length > 1
      ? last.slice(0, -1)
      : last;
  const camel = words
    .map((word, index) => index === 0
      ? word.charAt(0).toLowerCase() + word.slice(1)
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  return `${camel || 'record'}Id`;
}

export function recordIdentifierForCollection(
  collection: Pick<DataCollection, 'name' | 'identifier'>,
): RecordIdentifier {
  return collection.identifier ?? {
    key: defaultRecordIdentifierKey(collection.name),
    type: 'string',
    generation: 'backend',
  };
}

export interface DataCollection {
  id: string;
  projectId: string;
  databaseId: string;
  name: string;
  fields: DataField[];
  /** Optional only for backward compatibility; mappers materialize a default for old data. */
  identifier?: RecordIdentifier;
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
  identifier?: RecordIdentifier;
}

export interface UpdateCollectionInput {
  name: string;
  fields: DataField[];
  identifier?: RecordIdentifier;
}
