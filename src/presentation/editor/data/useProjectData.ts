import { useCallback, useEffect, useState } from 'react';
import type {
  CreateCollectionInput,
  CreateDatabaseInput,
  DataCollection,
  DataRecord,
  DataValue,
  ProjectDatabase,
  UpdateCollectionInput,
  UpdateDatabaseInput,
} from '@domain/entities/appData';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export type ProjectDataStatus = 'loading' | 'ready' | 'error';

export interface ProjectDataController {
  status: ProjectDataStatus;
  database: ProjectDatabase | null;
  databases: ProjectDatabase[];
  collections: DataCollection[];
  recordsByCollection: ReadonlyMap<string, DataRecord[]>;
  error: string | null;
  reload: () => void;
  createDatabase: (input: CreateDatabaseInput) => Promise<ProjectDatabase>;
  updateDatabase: (databaseId: string, input: UpdateDatabaseInput) => Promise<ProjectDatabase>;
  deleteDatabase: (databaseId: string) => Promise<void>;
  createCollection: (input: CreateCollectionInput) => Promise<DataCollection>;
  updateCollection: (collectionId: string, input: UpdateCollectionInput) => Promise<DataCollection>;
  deleteCollection: (collectionId: string) => Promise<void>;
  createRecord: (collectionId: string, values: Record<string, DataValue>) => Promise<DataRecord>;
  updateRecord: (collectionId: string, recordId: string, values: Record<string, DataValue>) => Promise<DataRecord>;
  deleteRecord: (collectionId: string, recordId: string) => Promise<void>;
}

export function useProjectData(projectId: string): ProjectDataController {
  const { appData } = useRepositories();
  const [status, setStatus] = useState<ProjectDataStatus>('loading');
  const [database, setDatabase] = useState<ProjectDatabase | null>(null);
  const [databases, setDatabases] = useState<ProjectDatabase[]>([]);
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [recordsByCollection, setRecordsByCollection] = useState<ReadonlyMap<string, DataRecord[]>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    void appData.exportProjectData(projectId).then((store) => {
      const primary = store.databases[0] ?? null;
      const recordLists = store.collections.map((collection) => [
        collection.id,
        store.records.filter((record) => record.collectionId === collection.id),
      ] as const);
      if (!active) return;
      setDatabases(store.databases);
      setDatabase(primary);
      setCollections(store.collections);
      setRecordsByCollection(new Map(recordLists));
      setStatus('ready');
    }).catch(() => {
      if (!active) return;
      setError('Project data could not be loaded.');
      setStatus('error');
    });
    return () => { active = false; };
  }, [appData, projectId, reloadToken]);

  const createDatabase = useCallback(async (input: CreateDatabaseInput): Promise<ProjectDatabase> => {
    const created = await appData.createDatabase(projectId, input);
    setDatabases((current) => [...current, created]);
    setDatabase((current) => current ?? created);
    return created;
  }, [appData, projectId]);

  const updateDatabase = useCallback(async (databaseId: string, input: UpdateDatabaseInput): Promise<ProjectDatabase> => {
    const updated = await appData.updateDatabase(projectId, databaseId, input);
    setDatabases((current) => current.map((item) => item.id === databaseId ? updated : item));
    setDatabase((current) => current?.id === databaseId ? updated : current);
    return updated;
  }, [appData, projectId]);

  const deleteDatabase = useCallback(async (databaseId: string): Promise<void> => {
    await appData.deleteDatabase(projectId, databaseId);
    setDatabases((current) => current.filter((item) => item.id !== databaseId));
    setDatabase((current) => current?.id === databaseId ? null : current);
    setCollections((current) => current.filter((item) => item.databaseId !== databaseId));
    setRecordsByCollection((current) => {
      const next = new Map(current);
      for (const collection of collections) {
        if (collection.databaseId === databaseId) next.delete(collection.id);
      }
      return next;
    });
  }, [appData, collections, projectId]);

  const createCollection = useCallback(async (input: CreateCollectionInput): Promise<DataCollection> => {
    const created = await appData.createCollection(projectId, {
      ...input,
      databaseId: input.databaseId ?? database?.id,
    });
    setCollections((current) => [...current, created]);
    setRecordsByCollection((current) => new Map([...current, [created.id, []]]));
    return created;
  }, [appData, database, projectId]);

  const updateCollection = useCallback(async (
    collectionId: string,
    input: UpdateCollectionInput,
  ): Promise<DataCollection> => {
    const updated = await appData.updateCollection(projectId, collectionId, input);
    setCollections((current) => current.map((item) => item.id === collectionId ? updated : item));
    const records = await appData.listRecords(projectId, collectionId);
    setRecordsByCollection((current) => new Map([...current, [collectionId, records]]));
    return updated;
  }, [appData, projectId]);

  const deleteCollection = useCallback(async (collectionId: string): Promise<void> => {
    await appData.deleteCollection(projectId, collectionId);
    setCollections((current) => current.filter((item) => item.id !== collectionId));
    setRecordsByCollection((current) => {
      const next = new Map(current);
      next.delete(collectionId);
      return next;
    });
  }, [appData, projectId]);

  const createRecord = useCallback(async (
    collectionId: string,
    values: Record<string, DataValue>,
  ): Promise<DataRecord> => {
    const created = await appData.createRecord(projectId, collectionId, values);
    setRecordsByCollection((current) => new Map([
      ...current,
      [collectionId, [...(current.get(collectionId) ?? []), created]],
    ]));
    return created;
  }, [appData, projectId]);

  const updateRecord = useCallback(async (
    collectionId: string,
    recordId: string,
    values: Record<string, DataValue>,
  ): Promise<DataRecord> => {
    const updated = await appData.updateRecord(projectId, collectionId, recordId, values);
    setRecordsByCollection((current) => new Map([
      ...current,
      [collectionId, (current.get(collectionId) ?? []).map((item) => item.id === recordId ? updated : item)],
    ]));
    return updated;
  }, [appData, projectId]);

  const deleteRecord = useCallback(async (collectionId: string, recordId: string): Promise<void> => {
    await appData.deleteRecord(projectId, collectionId, recordId);
    setRecordsByCollection((current) => new Map([
      ...current,
      [collectionId, (current.get(collectionId) ?? []).filter((item) => item.id !== recordId)],
    ]));
  }, [appData, projectId]);

  return {
    status,
    database,
    databases,
    collections,
    recordsByCollection,
    error,
    reload: () => setReloadToken((current) => current + 1),
    createDatabase,
    updateDatabase,
    deleteDatabase,
    createCollection,
    updateCollection,
    deleteCollection,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
