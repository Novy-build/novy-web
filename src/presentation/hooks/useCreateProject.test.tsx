import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { useCreateProject } from './useCreateProject';

beforeEach(() => window.localStorage.clear());

describe('useCreateProject', () => {
  it('creates a project and provisions the selected template data', async () => {
    const repositories = createStubRepositories();
    const notes = TEMPLATE_CATALOG.find((template) => template.id === 'template_notes')!;
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: ({ children }) => (
        <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
      ),
    });

    let projectId = '';
    await act(async () => {
      projectId = (await result.current('Notes example', notes)).id;
    });

    expect((await repositories.appData.listDatabases(projectId))[0]?.name).toBe('Notes Database');
    expect((await repositories.appData.listCollections(projectId))[0]?.name).toBe('Notes');
  });
});
