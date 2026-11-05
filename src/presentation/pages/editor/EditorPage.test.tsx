import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import type { Repositories } from '@data/repositories/local';
import type { Project } from '@domain/entities/project';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function renderRoutesAt(path: string, repositories?: Repositories) {
  render(
    <RepositoriesProvider repositories={repositories ?? createStubRepositories({ sessionUser: STUB_USER })}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

describe('EditorPage (integration over the real route tree)', () => {
  it('mounts the design workspace for an existing project', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    expect(projects).toHaveLength(1);

    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);

    const canvas = await screen.findByTestId('canvas-frame');
    expect(within(canvas).getByText('Hello, World!')).toBeInTheDocument();
    expect(within(canvas).getByText('Press the button to change the text above.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('switches to the Logic placeholder and back', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByRole('button', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'logic' }));
    expect(await screen.findByRole('heading', { name: 'Logic' })).toBeInTheDocument();
    expect(await screen.findByText(/The Logic workspace arrives in Phase 5/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to design' }));
    expect(await screen.findByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('previews the active screen and closes again', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByRole('button', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Previewing Hello, World!');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('button', { name: 'Preview' })).toBeInTheDocument();
  });

  it('navigates to the deployment flow from Deploy', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByRole('button', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));

    expect(await screen.findByRole('heading', { name: 'Deployment' })).toBeInTheDocument();
  });

  it('shows not-found for a missing project id', async () => {
    renderRoutesAt('/project/missing-id/editor');

    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByText('missing-id')).toBeInTheDocument();
  });

  it('keeps loading while the project resolves', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    vi.spyOn(repositories.projects, 'getProject').mockImplementation(
      () => new Promise<Project | null>(() => undefined),
    );

    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);

    expect(await screen.findByText('Loading editor…')).toBeInTheDocument();
  });
});
