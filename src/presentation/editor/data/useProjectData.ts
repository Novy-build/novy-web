import { useCallback, useEffect, useState } from 'react';
import type {
  CreateCollectionInput,
  DataCollection,
  DataRecord,
  DataValue,
  UpdateCollectionInput,
} from '@domain/entities/appData';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export type ProjectDataStatus = 'loading' | 'ready' | 'error';

export interface ProjectDataController {
  status: ProjectDataStatus;
  collections: DataCollection[];
  recordsByCollection: ReadonlyMap<string, DataRecord[]>;
  error: string | null;
  reload: () => void;
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
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [recordsByCollection, setRecordsByCollection] = useState<ReadonlyMap<string, DataRecord[]>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    void appData.listCollections(projectId).then(async (loaded) => {
      const recordLists = await Promise.all(
        loaded.map(async (collection) => [collection.id, await appData.listRecords(projectId, collection.id)] as const),
      );
      if (!active) return;
      setCollections(loaded);
      setRecordsByCollection(new Map(recordLists));
      setStatus('ready');
    }).catch(() => {
      if (!active) return;
      setError('Project data could not be loaded.');
      setStatus('error');
    });
    return () => { active = false; };
  }, [appData, projectId, reloadToken]);

  const createCollection = useCallback(async (input: CreateCollectionInput): Promise<DataCollection> => {
    const created = await appData.createCollection(projectId, input);
    setCollections((current) => [...current, created]);
    setRecordsByCollection((current) => new Map([...current, [created.id, []]]));
    return created;
  }, [appData, projectId]);

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
    collections,
    recordsByCollection,
    error,
    reload: () => setReloadToken((current) => current + 1),
    createCollection,
    updateCollection,
    deleteCollection,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
