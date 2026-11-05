import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalRepositories, type Repositories } from '@data/repositories/local';
import { RepositoriesProvider, useRepositories } from './RepositoriesProvider';

beforeEach(() => {
  window.localStorage.clear();
});

function Probe() {
  const repositories = useRepositories();
  const kind = repositories.projects.constructor.name;
  return <div data-testid="probe">{kind}</div>;
}

describe('RepositoriesProvider', () => {
  it('injects the localStorage repositories by default', () => {
    render(
      <RepositoriesProvider>
        <Probe />
      </RepositoriesProvider>,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('LocalStorageProjectRepository');
  });

  it('accepts injected repositories (used by tests and future overrides)', () => {
    const injected: Repositories = createLocalRepositories({ latencyMs: 0 });
    render(
      <RepositoriesProvider repositories={injected}>
        <Probe />
      </RepositoriesProvider>,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('LocalStorageProjectRepository');
  });

  it('keeps one repository instance per mount rather than recreating on render', () => {
    const injected: Repositories = createLocalRepositories({ latencyMs: 0 });
    const { unmount } = render(
      <RepositoriesProvider repositories={injected}>
        <Probe />
      </RepositoriesProvider>,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('LocalStorageProjectRepository');
    unmount();
  });

  it('throws a helpful error when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/useRepositories must be used within a RepositoriesProvider/);
  });
});
