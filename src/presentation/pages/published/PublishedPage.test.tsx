import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Repositories } from '@data/repositories/local';
import type { PublishedApplication } from '@domain/entities/deployment';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { MemoryRouter } from 'react-router';
import { PublishedPage } from './PublishedPage';

beforeEach(() => {
  window.localStorage.clear();
});

const ACTIVE: PublishedApplication = {
  projectId: 'project_live',
  projectName: 'Live App',
  active: true,
  status: 'live',
  url: 'https://live.novy.app',
  environment: 'production',
  provider: 'vercel',
  lastPublishedAt: new Date('2026-11-20T10:00:00.000Z'),
  deploymentCount: 3,
};

const INACTIVE: PublishedApplication = {
  projectId: 'project_stopped',
  projectName: 'Stopped App',
  active: false,
  status: 'failed',
  url: null,
  environment: 'preview',
  provider: 'netlify',
  lastPublishedAt: new Date('2026-11-19T10:00:00.000Z'),
  deploymentCount: 1,
};

function renderPage(applications: PublishedApplication[] | Error): Repositories {
  const base = createStubRepositories();
  const repositories: Repositories = {
    ...base,
    deployments: {
      ...base.deployments,
      listPublishedApplications: async () => {
        if (applications instanceof Error) throw applications;
        return applications;
      },
    },
  };
  render(
    <RepositoriesProvider repositories={repositories}>
      <MemoryRouter>
        <PublishedPage />
      </MemoryRouter>
    </RepositoriesProvider>,
  );
  return repositories;
}

describe('PublishedPage', () => {
  it('lists published apps with active and inactive badges', async () => {
    renderPage([ACTIVE, INACTIVE]);

    expect(await screen.findByRole('heading', { name: 'Published' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live App' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stopped App' })).toBeInTheDocument();
    expect(screen.getAllByText('Active', { selector: 'span' })).toHaveLength(1);
    expect(screen.getAllByText('Inactive', { selector: 'span' })).toHaveLength(1);
    expect(screen.getByText('1 active · 1 inactive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open live app/ })).toHaveAttribute(
      'href',
      'https://live.novy.app',
    );
    expect(screen.getByText('No live URL')).toBeInTheDocument();
  });

  it('filters by active or inactive status', async () => {
    renderPage([ACTIVE, INACTIVE]);
    await screen.findByRole('heading', { name: 'Live App' });

    fireEvent.click(screen.getByRole('button', { name: 'Inactive' }));
    expect(screen.queryByRole('heading', { name: 'Live App' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stopped App' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByRole('heading', { name: 'Live App' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Stopped App' })).not.toBeInTheDocument();
  });

  it('links each app to its deployment settings', async () => {
    renderPage([ACTIVE]);
    await screen.findByRole('heading', { name: 'Live App' });

    expect(screen.getByRole('link', { name: /Deployment settings/ })).toHaveAttribute(
      'href',
      '/project/project_live/deploy',
    );
  });

  it('shows an empty state when nothing has been published', async () => {
    renderPage([]);

    expect(await screen.findByRole('heading', { name: 'Nothing published yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to projects' })).toHaveAttribute('href', '/projects');
  });

  it('shows a retryable failure state', async () => {
    renderPage(new Error('offline'));

    expect(
      await screen.findByRole('heading', {
        name: 'We could not load your published applications',
      }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });
});
