import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { useProjectData } from './useProjectData';

beforeEach(() => window.localStorage.clear());

describe('useProjectData', () => {
  it('loads and synchronizes collection and record mutations', async () => {
    const repositories = createStubRepositories();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    );
    const { result } = renderHook(() => useProjectData('project_1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.createDatabase({ name: 'Project database' });
    });
    let collectionId = '';
    await act(async () => {
      collectionId = (await result.current.createCollection({ name: 'Students' })).id;
    });
    expect(result.current.collections).toHaveLength(1);

    await act(async () => {
      await result.current.createRecord(collectionId, {
        [result.current.collections[0]!.fields[0]!.id]: 'Ada',
      });
    });
    expect(result.current.recordsByCollection.get(collectionId)).toHaveLength(1);

    await act(async () => {
      await result.current.deleteCollection(collectionId);
    });
    expect(result.current.collections).toEqual([]);
    expect(result.current.recordsByCollection.has(collectionId)).toBe(false);
  });
});
