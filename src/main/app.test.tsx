import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { RepositoriesProvider } from './providers/RepositoriesProvider';
import { SessionProvider } from './providers/SessionProvider';
import { AppRoutes } from './routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
});

interface RenderRoutesOptions {
  authenticated?: boolean;
}

/**
 * Renders the real route tree inside a MemoryRouter so deep links can be
 * simulated without touching browser history. The session is restored
 * asynchronously by SessionProvider, so tests must await their assertions.
 */
function renderRoutesAt(path: string, { authenticated = true }: RenderRoutesOptions = {}) {
  return render(
    <RepositoriesProvider
      repositories={createStubRepositories({ sessionUser: authenticated ? STUB_USER : null })}
    >
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

describe('application routing', () => {
  it('redirects the root URL to the projects screen', async () => {
    renderRoutesAt('/');

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('renders the projects screen for authenticated users', async () => {
    renderRoutesAt('/projects');

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('redirects anonymous users from guarded routes to the login screen', async () => {
    renderRoutesAt('/projects', { authenticated: false });

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('lets anonymous users visit the login screen', async () => {
    renderRoutesAt('/login', { authenticated: false });

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('forwards bare project URLs to the editor', async () => {
    renderRoutesAt('/project/abc-123');

    // Unknown project ids now land on the real editor route, which reports
    // not-found rather than a stage placeholder.
    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });

  it('reports not-found when opening a missing project in the editor', async () => {
    renderRoutesAt('/project/abc-123/editor');

    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });

  it('renders the deployment screen for a project id', async () => {
    renderRoutesAt('/project/abc-123/deploy');

    expect(await screen.findByRole('heading', { name: 'Deployment' })).toBeInTheDocument();
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });

  it('falls back to the projects screen for unknown URLs', async () => {
    renderRoutesAt('/nowhere');

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });
});
