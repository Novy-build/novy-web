import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { useDeployment } from './useDeployment';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDeployment', () => {
  it('advances through all four stages and persists a live production record', async () => {
    const repositories = createStubRepositories();
    await ensureDemoProject(repositories);
    const project = (await repositories.projects.listProjects())[0]!;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    );
    const { result } = renderHook(() => useDeployment(project.id), {
      wrapper,
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.setEnvironment('production'));
    vi.useFakeTimers();
    let publishing: Promise<void> = Promise.resolve();
    act(() => {
      publishing = result.current.publish();
    });

    expect(result.current.isPublishing).toBe(true);
    expect(result.current.activeStageIndex).toBe(0);

    await act(async () => vi.advanceTimersToNextTimerAsync());
    expect(result.current.activeStageIndex).toBe(1);
    await act(async () => vi.advanceTimersToNextTimerAsync());
    expect(result.current.activeStageIndex).toBe(2);
    await act(async () => vi.advanceTimersToNextTimerAsync());
    expect(result.current.activeStageIndex).toBe(3);
    await act(async () => vi.runAllTimersAsync());
    await act(async () => publishing);

    expect(result.current.isPublishing).toBe(false);
    expect(result.current.successfulDeployment).toMatchObject({
      status: 'live',
      url: 'https://hello-world.novy.app',
    });
    expect(result.current.deployments).toHaveLength(1);
    vi.useRealTimers();
    expect(await repositories.deployments.listDeployments(project.id)).toHaveLength(1);
  });

  it('reports a failed repository publish without adding history', async () => {
    const repositories = createStubRepositories();
    await ensureDemoProject(repositories);
    const project = (await repositories.projects.listProjects())[0]!;
    repositories.deployments.publishDeployment = vi.fn().mockRejectedValue(new Error('offline'));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    );
    const { result } = renderHook(() => useDeployment(project.id), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    vi.useFakeTimers();

    let publishing: Promise<void> = Promise.resolve();
    act(() => {
      publishing = result.current.publish();
    });
    await act(async () => vi.runAllTimersAsync());
    await act(async () => publishing);

    expect(result.current.isPublishing).toBe(false);
    expect(result.current.deployments).toEqual([]);
    expect(result.current.publishError).toMatch(/Publish failed/);
  });
});
