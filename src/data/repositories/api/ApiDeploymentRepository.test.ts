import { describe, expect, it, vi } from 'vitest';
import type { ApiHttpClient } from '../../api/http';
import { ApiDeploymentRepository } from './ApiDeploymentRepository';

const BUILDING = {
  id: 'deployment_1',
  projectId: 'project_1',
  appVersionId: 'app_1',
  environment: 'production' as const,
  provider: 'vercel' as const,
  status: 'building' as const,
  url: null,
  errorCode: null,
  errorMessage: null,
  createdAt: '2026-11-14T10:00:00Z',
  updatedAt: '2026-11-14T10:00:00Z',
  completedAt: null,
};

function makeClient(): { client: ApiHttpClient; get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> } {
  const get = vi.fn();
  const post = vi.fn();
  const client: ApiHttpClient = {
    get,
    post,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return { client, get, post };
}

describe('ApiDeploymentRepository', () => {
  it('deduplicates concurrent provider discovery', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue({ status: 200, data: { providers: ['vercel'] } });
    const repository = new ApiDeploymentRepository(client);

    await Promise.all([repository.listProviders(), repository.listProviders()]);

    expect(get).toHaveBeenCalledOnce();
  });

  it('loads configured providers and deployment history', async () => {
    const { client, get } = makeClient();
    get
      .mockResolvedValueOnce({ status: 200, data: { providers: ['vercel', 'netlify'] } })
      .mockResolvedValueOnce({ status: 200, data: { deployments: [BUILDING] } });
    const repository = new ApiDeploymentRepository(client);

    await expect(repository.listProviders()).resolves.toEqual(['vercel', 'netlify']);
    const history = await repository.listDeployments('project_1');

    expect(history[0]).toMatchObject({ id: 'deployment_1', provider: 'vercel' });
    expect(history[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('submits the manifest and polls until the deployment is live', async () => {
    const { client, get, post } = makeClient();
    post.mockResolvedValue({ status: 202, data: BUILDING });
    get.mockResolvedValue({
      status: 200,
      data: {
        ...BUILDING,
        status: 'live',
        url: 'https://my-app.vercel.app',
        completedAt: '2026-11-14T10:01:00Z',
      },
    });
    const repository = new ApiDeploymentRepository(client, {
      pollIntervalMs: 0,
      maxPollAttempts: 2,
    });
    const stages: string[] = [];

    const deployment = await repository.publishDeployment(
      {
        projectId: 'project_1',
        manifest: { manifestVersion: 2 },
        environment: 'production',
        provider: 'vercel',
      },
      (stage) => stages.push(stage),
    );

    expect(post).toHaveBeenCalledWith('/projects/project_1/deployments', {
      manifest: { manifestVersion: 2 },
      environment: 'production',
      provider: 'vercel',
    });
    expect(deployment.status).toBe('live');
    expect(stages).toEqual(['build', 'optimize', 'provision', 'live']);
  });
});
