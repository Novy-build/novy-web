import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Project, ProjectSummary } from '@domain/entities/project';
import { ProjectError } from '@domain/errors/ProjectError';
import type { ProjectImportRepository } from '@domain/repositories/projectImport.repository';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { LocalProjectImportPanel } from './LocalProjectImportPanel';

const NOW = new Date('2026-11-11T12:00:00.000Z');

const SUMMARY: ProjectSummary = {
  id: 'project_local',
  name: 'Local app',
  projectType: 'app',
  createdAt: NOW,
  updatedAt: NOW,
  screenCount: 1,
  previewScreen: null,
};

const PROJECT: Project = {
  id: 'project_local',
  name: 'Local app',
  projectType: 'app',
  createdAt: NOW,
  updatedAt: NOW,
  document: { screens: [] },
};

function renderPanel(
  localProjectImport: ProjectImportRepository | undefined,
  onImported = vi.fn(),
): ReturnType<typeof vi.fn> {
  const repositories = createStubRepositories();
  if (localProjectImport) {
    repositories.localProjectImport = localProjectImport;
  }

  render(
    <RepositoriesProvider repositories={repositories}>
      <LocalProjectImportPanel onImported={onImported} />
    </RepositoriesProvider>,
  );
  return onImported;
}

describe('LocalProjectImportPanel', () => {
  it('stays hidden for local-only workspaces', () => {
    renderPanel(undefined);

    expect(
      screen.queryByRole('heading', { name: 'Projects saved in this browser' }),
    ).not.toBeInTheDocument();
  });

  it('lists importable projects and reports a successful import', async () => {
    const importProject = vi.fn().mockResolvedValue(PROJECT);
    const listImportableProjects = vi.fn().mockResolvedValue([SUMMARY]);
    const onImported = renderPanel({ listImportableProjects, importProject });

    expect(await screen.findByText('Local app')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import Local app' }));

    expect(await screen.findByText('Imported "Local app" into your account.')).toBeInTheDocument();
    expect(importProject).toHaveBeenCalledWith('project_local');
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('surfaces a typed import failure and keeps the project available', async () => {
    const importProject = vi.fn().mockRejectedValue(new ProjectError('already-exists'));
    const listImportableProjects = vi.fn().mockResolvedValue([SUMMARY]);
    renderPanel({ listImportableProjects, importProject });

    fireEvent.click(await screen.findByRole('button', { name: 'Import Local app' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This project already exists in your account.',
    );
    expect(screen.getByRole('button', { name: 'Import Local app' })).toBeEnabled();
  });
});
