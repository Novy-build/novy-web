import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
});

/**
 * Renders the real route tree at /projects with the seeded sample project in
 * the workspace (as the bootstrap does before the first render).
 */
async function renderProjectsPage(): Promise<void> {
  const repositories = createStubRepositories({ sessionUser: STUB_USER });
  await ensureDemoProject(repositories);

  render(
    <RepositoriesProvider repositories={repositories}>
      <MemoryRouter initialEntries={['/projects']}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

function getProjectCard(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { name });
  return heading.closest('article') as HTMLElement;
}

describe('ProjectsPage', () => {
  it('renders the dashboard with the seeded demo project', async () => {
    await renderProjectsPage();

    expect(await screen.findByRole('heading', { name: 'Hello, World!' })).toBeInTheDocument();
    expect(screen.getByText(/1 screen · Edited/)).toBeInTheDocument();
    expect(screen.getByText('Student Tester')).toBeInTheDocument();
  });

  it('signs out from the member header', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('searches projects by name', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'hello' } });
    expect(screen.getByRole('heading', { name: 'Hello, World!' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'nothing-bricked' } });
    expect(screen.getByText(/No projects match/)).toBeInTheDocument();
  });

  it('creates a project from a template and opens the editor', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(await screen.findByRole('heading', { name: 'Choose a starting template' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Student list/ }));
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Cornerstone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    // The real editor workspace replaces the Phase 2 placeholder heading.
    expect(await screen.findByRole('button', { name: 'Cornerstone' })).toBeInTheDocument();
    expect(screen.getByTestId('canvas-frame')).toBeInTheDocument();
  });

  it('renames a project through the dialog', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Rename Hello, World!' }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Renamed app' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByRole('heading', { name: 'Renamed app' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hello, World!' })).not.toBeInTheDocument();
  });

  it('guards against empty renames', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Rename Hello, World!' }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a project name.');
  });

  it('duplicates a project into a copy', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Hello, World!' }));

    expect(await screen.findByRole('heading', { name: 'Hello, World! (copy)' })).toBeInTheDocument();
  });

  it('deletes a project after explicit confirmation', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Hello, World!' }));
    expect(await screen.findByRole('heading', { name: 'Delete this project?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('permanently removed');

    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }));

    expect(await screen.findByText('Start building')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hello, World!' })).not.toBeInTheDocument();
  });

  it('keeps all project actions inside their own card', async () => {
    await renderProjectsPage();
    await screen.findByRole('heading', { name: 'Hello, World!' });

    const card = getProjectCard('Hello, World!');
    expect(within(card).getByRole('button', { name: 'Duplicate Hello, World!' })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Open Hello, World!' })).toBeInTheDocument();
  });
});
