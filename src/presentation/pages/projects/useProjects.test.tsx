import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Repositories } from '@data/repositories/local';
import type { Project } from '@domain/entities/project';
import type { ProjectRepository } from '@domain/repositories/project.repository';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { useProjects } from './useProjects';

beforeEach(() => {
  window.localStorage.clear();
});

/**
 * Minimal typed failure repository: every call rejects, matching the shape
 * the dashboard hook must survive without crashing its host screen.
 */
function createFailingProjectsRepository(): ProjectRepository {
  async function reject(): Promise<never> {
    throw new Error('disk full');
  }
  return {
    async listProjects(): Promise<never> {
      return reject();
    },
    async createProject(): Promise<never> {
      return reject();
    },
    async getProject(): Promise<never> {
      return reject();
    },
    async saveProjectDocument(): Promise<never> {
      return reject();
    },
    async renameProject(): Promise<never> {
      return reject();
    },
    async duplicateProject(): Promise<never> {
      return reject();
    },
    async deleteProject(): Promise<never> {
      return reject();
    },
  };
}

const FAILING_REPOSITORIES = {
  ...createStubRepositories(),
  projects: createFailingProjectsRepository(),
};

function renderUseProjects(repositories: Repositories) {
  return renderHook(() => useProjects(), {
    initialProps: {},
    wrapper: ({ children }) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    ),
  });
}

describe('useProjects', () => {
  it('loads the seeded project list', async () => {
    const repositories = createStubRepositories();
    await ensureDemoProject(repositories);

    const { result } = renderUseProjects(repositories);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.projects.map((project) => project.name)).toEqual(['Hello, World!']);
    expect(result.current.hasFailed).toBe(false);
  });

  it('returns the created project and refreshes the list', async () => {
    const { result } = renderUseProjects(createStubRepositories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: Project | undefined;
    await act(async () => {
      created = await result.current.createProject('New one', TEMPLATE_CATALOG[0]);
    });
    await waitFor(() => {
      expect(result.current.projects.map((project) => project.name)).toContain('New one');
    });

    expect(created?.name).toBe('New one');
  });

  it('reflects renames after a reload', async () => {
    const repositories = createStubRepositories();
    await ensureDemoProject(repositories);
    const { result } = renderUseProjects(repositories);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.renameProject(result.current.projects[0].id, 'Renamed app');
    });

    await waitFor(() => {
      expect(result.current.projects.map((project) => project.name)).toContain('Renamed app');
    });
  });

  it('adds duplicates through the repository', async () => {
    const repositories = createStubRepositories();
    await ensureDemoProject(repositories);
    const { result } = renderUseProjects(repositories);
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.duplicateProject(result.current.projects[0].id);
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(2));
  });

  it('removes projects from the list after deletion', async () => {
    const repositories = createStubRepositories();
    await ensureDemoProject(repositories);
    const { result } = renderUseProjects(repositories);
    await waitFor(() => expect(result.current.projects.length).toBeGreaterThan(0));

    const targetId = result.current.projects[0].id;
    await act(async () => {
      await result.current.deleteProject(targetId);
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(0));
  });

  it('reports load failure through hasFailed without throwing', async () => {
    const { result } = renderUseProjects(FAILING_REPOSITORIES);

    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(result.current.projects).toEqual([]);
  });
});
