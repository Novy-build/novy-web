import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageDeploymentRepository } from './LocalStorageDeploymentRepository';

function makeClock(start = Date.UTC(2026, 0, 1, 10, 0, 0)) {
  let current = start;
  return () => new Date((current += 60_000));
}

function createRepository() {
  window.localStorage.clear();
  const clock = makeClock();
  const repository = new LocalStorageDeploymentRepository(window.localStorage, {
    latencyMs: 0,
  });
  return { repository, clock };
}

describe('LocalStorageDeploymentRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with no deployment history', async () => {
    const { repository } = createRepository();

    expect(await repository.listDeployments('project_1')).toEqual([]);
  });

  it('records deployments and keeps them per project', async () => {
    const { repository, clock } = createRepository();

    await repository.createDeployment({ projectId: 'project_1', status: 'building', now: clock() });
    await repository.createDeployment({
      projectId: 'project_1',
      status: 'live',
      url: 'https://demo.novy.app',
      now: clock(),
    });
    await repository.createDeployment({ projectId: 'project_2', status: 'building', now: clock() });

    const own = await repository.listDeployments('project_1');
    expect(own).toHaveLength(2);
    // Most recent first.
    expect(own[0].status).toBe('live');
    expect(own[0].url).toBe('https://demo.novy.app');
    expect(own.every((record) => record.projectId === 'project_1')).toBe(true);

    expect(await repository.listDeployments('project_2')).toHaveLength(1);
  });

  it('persists records across instances', async () => {
    const { repository } = createRepository();
    await repository.createDeployment({ projectId: 'project_1', status: 'live', url: 'https://x.novy.app' });

    const fresh = new LocalStorageDeploymentRepository(window.localStorage, { latencyMs: 0 });
    const records = await fresh.listDeployments('project_1');

    expect(records).toHaveLength(1);
    expect(records[0].url).toBe('https://x.novy.app');
  });

  it('derives published applications from deployment history', async () => {
    const { repository, clock } = createRepository();
    await repository.createDeployment({
      projectId: 'project_1',
      status: 'live',
      url: 'https://live.novy.app',
      now: clock(),
    });
    await repository.createDeployment({ projectId: 'project_1', status: 'failed', now: clock() });
    await repository.createDeployment({ projectId: 'project_2', status: 'failed', now: clock() });

    const withNames = new LocalStorageDeploymentRepository(window.localStorage, {
      latencyMs: 0,
      listProjectNames: async () => [
        { id: 'project_1', name: 'Live App' },
        { id: 'project_2', name: 'Stopped App' },
      ],
    });
    const applications = await withNames.listPublishedApplications();

    expect(applications.map((item) => [item.projectId, item.active])).toEqual([
      ['project_2', false],
      ['project_1', true],
    ]);
    const live = applications.find((item) => item.projectId === 'project_1');
    expect(live).toMatchObject({
      projectName: 'Live App',
      url: 'https://live.novy.app',
      status: 'failed',
      deploymentCount: 2,
      environment: 'preview',
      provider: 'development',
    });
  });

  it('falls back to the project id when a name is unavailable', async () => {
    const { repository } = createRepository();
    await repository.createDeployment({ projectId: 'project_9', status: 'live', url: 'https://x.novy.app' });

    const applications = await repository.listPublishedApplications();

    expect(applications).toHaveLength(1);
    expect(applications[0]?.projectName).toBe('project_9');
    expect(applications[0]?.active).toBe(true);
  });

  it('simulates every publish stage before persisting the live result', async () => {
    const stages: string[] = [];
    const repository = new LocalStorageDeploymentRepository(window.localStorage, {
      latencyMs: 0,
      pipelineStepMs: 0,
    });

    const published = await repository.publishDeployment(
      { projectId: 'project_1', url: 'https://demo.novy.app' },
      (stage) => stages.push(stage),
    );

    expect(stages).toEqual(['build', 'optimize', 'provision', 'live']);
    expect(published).toMatchObject({ status: 'live', url: 'https://demo.novy.app' });
    expect(await repository.listDeployments('project_1')).toHaveLength(1);
  });
});
