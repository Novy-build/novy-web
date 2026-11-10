import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import {
  ApiReactExportRepository,
  type ReactExportHttpClient,
} from './ApiReactExportRepository';

function makeClient(): {
  client: ReactExportHttpClient;
  post: ReturnType<typeof vi.fn<ReactExportHttpClient['post']>>;
} {
  const post = vi.fn<ReactExportHttpClient['post']>();
  return { client: { post }, post };
}

function apiFailure(status: number, code: string, details?: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data: { error: { code, message: 'Backend message.', details } },
    status,
    statusText: 'Error',
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return error;
}

describe('ApiReactExportRepository', () => {
  it('requests an arraybuffer and returns the safe backend filename', async () => {
    const { client, post } = makeClient();
    const content = new Uint8Array([80, 75, 3, 4]).buffer;
    post.mockResolvedValue({
      data: content,
      headers: { 'content-disposition': 'attachment; filename="notes-react.zip"' },
    });

    await expect(new ApiReactExportRepository(client).exportReact({ manifestVersion: 2 }))
      .resolves.toEqual({ content, filename: 'notes-react.zip' });
    expect(post).toHaveBeenCalledWith(
      '/exports/react',
      { manifestVersion: 2 },
      { responseType: 'arraybuffer', timeout: 30_000 },
    );
  });

  it('maps backend manifest issues to a typed validation error', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(
      apiFailure(422, 'invalid_manifest', {
        issues: [{ path: 'project.schemaVersion', message: 'Unsupported project version.' }],
      }),
    );

    await expect(new ApiReactExportRepository(client).exportReact({})).rejects.toMatchObject({
      code: 'validation',
      message: 'Unsupported project version.',
    });
  });

  it('maps generation timeout and network failures', async () => {
    const { client, post } = makeClient();
    const repository = new ApiReactExportRepository(client);
    post.mockRejectedValueOnce(apiFailure(504, 'generation_timeout'));

    await expect(repository.exportReact({})).rejects.toMatchObject({ code: 'timeout' });

    post.mockRejectedValueOnce(new AxiosError('Network unavailable'));
    await expect(repository.exportReact({})).rejects.toMatchObject({ code: 'network' });
  });

  it('rejects a non-archive response', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue({ data: 'not-an-arraybuffer', headers: {} });

    await expect(new ApiReactExportRepository(client).exportReact({})).rejects.toMatchObject({
      code: 'generation',
    });
  });
});
