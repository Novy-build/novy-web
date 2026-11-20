import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repositories } from '@data/repositories/local';
import type { PublishedApplication } from '@domain/entities/deployment';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { usePublishedApplications } from './usePublishedApplications';

beforeEach(() => {
  window.localStorage.clear();
});

const APPLICATION: PublishedApplication = {
  projectId: 'project_1',
  projectName: 'Live App',
  active: true,
  status: 'live',
  url: 'https://live.novy.app',
  environment: 'production',
  provider: 'development',
  lastPublishedAt: new Date('2026-11-20T10:00:00.000Z'),
  deploymentCount: 2,
};

function withPublished(
  listPublishedApplications: () => Promise<PublishedApplication[]>,
): Repositories {
  const base = createStubRepositories();
  return {
    ...base,
    deployments: { ...base.deployments, listPublishedApplications },
  };
}

function renderUsePublished(repositories: Repositories) {
  return renderHook(() => usePublishedApplications(), {
    wrapper: ({ children }) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    ),
  });
}

describe('usePublishedApplications', () => {
  it('loads the publishing summary', async () => {
    const { result } = renderUsePublished(withPublished(async () => [APPLICATION]));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasFailed).toBe(false);
    expect(result.current.applications).toEqual([APPLICATION]);
  });

  it('reloads when asked', async () => {
    const listPublishedApplications = vi.fn(async () => [APPLICATION]);
    const { result } = renderUsePublished(withPublished(listPublishedApplications));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(listPublishedApplications).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());
    await waitFor(() => expect(listPublishedApplications).toHaveBeenCalledTimes(2));
  });

  it('reports failures without throwing', async () => {
    const { result } = renderUsePublished(
      withPublished(async () => {
        throw new Error('offline');
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasFailed).toBe(true);
    expect(result.current.applications).toEqual([]);
  });
});
