import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
});

function renderAt(path: string, authenticated = true) {
  const repositories = createStubRepositories({ sessionUser: authenticated ? STUB_USER : null });
  return render(
    <RepositoriesProvider repositories={repositories}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

describe('AppShell', () => {
  it('renders the sidebar on the projects screen', async () => {
    renderAt('/projects');
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Workspace' })).toBeInTheDocument();
  });

  it('renders the sidebar on the deployment screen', async () => {
    renderAt('/project/abc-123/deploy');
    // deployment for missing project shows not-found status, but shell still renders
    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
  });

  it('does not render the sidebar on the editor screen', async () => {
    renderAt('/project/abc-123/editor');
    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary navigation')).not.toBeInTheDocument();
  });

  it('does not render the sidebar on the login screen', async () => {
    renderAt('/login', false);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary navigation')).not.toBeInTheDocument();
  });

  it('does not render the sidebar for anonymous users on guarded routes', async () => {
    renderAt('/projects', false);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary navigation')).not.toBeInTheDocument();
  });
});
