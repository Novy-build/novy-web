import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import type { Repositories } from '@data/repositories/local';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDeployment(projectId: string, repositories: Repositories) {
  return render(
    <RepositoriesProvider repositories={repositories}>
      <MemoryRouter initialEntries={[`/project/${projectId}/deploy`]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

async function setupProject(): Promise<{ repositories: Repositories; projectId: string }> {
  const repositories = createStubRepositories({ sessionUser: STUB_USER });
  await ensureDemoProject(repositories);
  const project = (await repositories.projects.listProjects())[0]!;
  return { repositories, projectId: project.id };
}

describe('DeploymentPage', () => {
  it('renders environment controls, persisted history, and the custom-domain stub', async () => {
    const { repositories, projectId } = await setupProject();
    await repositories.deployments.createDeployment({
      projectId,
      status: 'failed',
      now: new Date('2026-01-01T10:00:00Z'),
    });
    await repositories.deployments.createDeployment({
      projectId,
      status: 'live',
      url: 'https://hello-world.novy.app',
      now: new Date('2026-01-02T10:00:00Z'),
    });
    renderDeployment(projectId, repositories);

    expect(await screen.findByRole('heading', { name: 'Publish your app' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create new project' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to editor' })).toBeInTheDocument();
    const previewEnvironment = screen.getByRole('button', { name: 'Preview environment' });
    expect(previewEnvironment).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(previewEnvironment).toHaveClass('bg-brand-500/10', 'dark:bg-brand-500/15');
    expect(previewEnvironment).not.toHaveClass('bg-brand-50');
    expect(screen.getByRole('button', { name: 'Production environment' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Domain' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Connect domain' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Redeploy' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      'https://hello-world.novy.app',
    );
  });

  it('publishes production through every stage, copies its URL, and adds history', async () => {
    const { repositories, projectId } = await setupProject();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderDeployment(projectId, repositories);
    await screen.findByRole('heading', { name: 'Publish your app' });

    fireEvent.click(screen.getByRole('button', { name: 'Production environment' }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByText('Publishing — Build')).toBeInTheDocument();
    const publishProgress = screen.getByRole('region', { name: 'Publish progress' });
    expect(publishProgress).toHaveClass('bg-brand-500/10', 'dark:bg-brand-500/15');
    expect(publishProgress).not.toHaveClass('bg-brand-50');
    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled();
    await act(async () => vi.advanceTimersToNextTimerAsync());
    expect(screen.getByText('Publishing — Optimize')).toBeInTheDocument();
    await act(async () => vi.runAllTimersAsync());

    const dialog = screen.getByRole('dialog', { name: 'Your app is live' });
    const url = 'https://hello-world.novy.app';
    expect(within(dialog).getByRole('link', { name: url })).toHaveAttribute('href', url);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy URL' }));
    await act(async () => Promise.resolve());
    expect(writeText).toHaveBeenCalledWith(url);
    expect(within(dialog).getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', url);
  });

  it('starts the same publish pipeline from Redeploy', async () => {
    const { repositories, projectId } = await setupProject();
    await repositories.deployments.createDeployment({
      projectId,
      status: 'live',
      url: 'https://hello-world-preview.novy.app',
    });
    renderDeployment(projectId, repositories);
    await screen.findByRole('heading', { name: 'Publish your app' });
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Redeploy' }));

    expect(screen.getByText('Publishing — Build')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redeploy' })).toBeDisabled();
  });

  it('reports that React export needs a configured backend', async () => {
    const { repositories, projectId } = await setupProject();
    renderDeployment(projectId, repositories);
    await screen.findByRole('heading', { name: 'Publish your app' });

    fireEvent.click(screen.getByRole('button', { name: 'Download React app' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Configure VITE_API_BASE_URL and sign in to download a React app.',
    );
  });

  it('blocks publishing when project collections cannot be loaded', async () => {
    const { repositories, projectId } = await setupProject();
    const publishDeployment = vi.spyOn(repositories.deployments, 'publishDeployment');
    repositories.appData.listCollections = vi.fn().mockRejectedValue(new Error('offline'));
    renderDeployment(projectId, repositories);
    await screen.findByRole('heading', { name: 'Publish your app' });

    expect(screen.getByText(/project data could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(publishDeployment).not.toHaveBeenCalled();
  });

  it('reports a missing project rather than rendering publish controls', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    renderDeployment('missing-project', repositories);

    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
});
