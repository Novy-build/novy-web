import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { ApiHttpClient } from '@data/api/http';
import { ApiRuntimePreviewRepository } from './ApiRuntimePreviewRepository';

function client(post: ApiHttpClient['post']): ApiHttpClient {
  return {
    get: vi.fn(),
    post,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

describe('ApiRuntimePreviewRepository', () => {
  it('prepares an immutable runtime version and executes an action', async () => {
    const builderPost = vi.fn<ApiHttpClient['post']>().mockResolvedValue({
      status: 200,
      data: { appId: 'app_preview' },
    });
    const runtimePost = vi.fn<ApiHttpClient['post']>().mockResolvedValue({
      status: 200,
      data: { output: { answer: 'Grounded answer' } },
    });
    const repository = new ApiRuntimePreviewRepository(client(builderPost), client(runtimePost));

    await expect(repository.prepare({ manifestVersion: 2 })).resolves.toEqual({ appId: 'app_preview' });
    await expect(repository.execute(
      'app_preview',
      'action_agent',
      { type: 'ai-agent', instructions: '', maxIterations: 2, returnIntermediateSteps: false },
      { question: 'What is this document about?' },
    )).resolves.toEqual({ answer: 'Grounded answer' });

    expect(builderPost).toHaveBeenCalledWith('/exports/runtime-preview', { manifestVersion: 2 });
    expect(runtimePost.mock.calls[0]?.[0]).toContain('/runtime/v1/apps/app_preview/actions/action_agent/execute');
  });

  it('uploads selected documents as bounded multipart media', async () => {
    const runtimePost = vi.fn<ApiHttpClient['post']>().mockResolvedValue({
      status: 200,
      data: { output: { sourceId: 'source_1' } },
    });
    const repository = new ApiRuntimePreviewRepository(client(vi.fn()), client(runtimePost));
    const file = new File(['Document body'], 'document.txt', { type: 'text/plain' });

    await expect(repository.uploadDocument(
      'app_preview',
      'action_upload',
      { mediaReference: 'media:document.txt' },
      file,
    )).resolves.toEqual({ sourceId: 'source_1' });

    expect(runtimePost.mock.calls[0]?.[1]).toBeInstanceOf(FormData);
  });

  it('explains how to recover when the selected local RAG provider is unavailable', async () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: {
        error: {
          code: 'rag_provider_unavailable',
          message: 'The selected RAG provider is temporarily unavailable.',
          details: null,
        },
      },
      status: 503,
      statusText: 'Service Unavailable',
      headers: {},
      config: {},
    } as unknown as AxiosResponse;
    const runtimePost = vi.fn<ApiHttpClient['post']>().mockRejectedValue(error);
    const repository = new ApiRuntimePreviewRepository(client(vi.fn()), client(runtimePost));

    await expect(repository.execute(
      'app_preview',
      'action_store',
      {
        type: 'vector-store',
        operation: 'upsert',
        connectionProfileId: 'postgres-vector',
        indexName: 'documents',
        namespace: '',
        documentInputMode: 'document-loader',
        conflictMode: 'replace',
        documentId: '',
        topK: 5,
        minimumScore: 0,
      },
      {},
    )).rejects.toMatchObject({
      code: 'rag_provider_unavailable',
      message: expect.stringContaining('start Ollama and try again'),
    });
  });

  it('resets preview data through the authenticated builder API', async () => {
    const builderPost = vi.fn<ApiHttpClient['post']>().mockResolvedValue({
      status: 200,
      data: { clearedRecords: 3 },
    });
    const repository = new ApiRuntimePreviewRepository(client(builderPost), client(vi.fn()));

    await expect(repository.resetData('project_1')).resolves.toBe(3);

    expect(builderPost).toHaveBeenCalledWith(
      '/exports/runtime-preview/reset',
      { projectId: 'project_1' },
    );
  });

  it('creates a challenge and sends vision media with runtime credentials', async () => {
    const runtimePost = vi.fn<ApiHttpClient['post']>()
      .mockResolvedValueOnce({ status: 200, data: { challengeId: 'challenge_1' } })
      .mockResolvedValueOnce({ status: 200, data: { output: { isLive: true } } });
    const repository = new ApiRuntimePreviewRepository(client(vi.fn()), client(runtimePost));
    const media = new File(['camera'], 'capture.jpg', { type: 'image/jpeg' });

    await expect(repository.executeVision(
      'app_preview',
      'action_liveness',
      { mediaReference: 'media:capture.jpg' },
      media,
    )).resolves.toEqual({ isLive: true });

    expect(runtimePost.mock.calls[0]?.[2]).toMatchObject({ withCredentials: true });
    expect(runtimePost.mock.calls[1]?.[1]).toBeInstanceOf(FormData);
    expect(runtimePost.mock.calls[1]?.[2]).toMatchObject({ withCredentials: true });
  });

  it('keeps the returned runtime CSRF token for protected requests', async () => {
    const runtimePost = vi.fn<ApiHttpClient['post']>()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          user: { id: 'runtime_user', email: 'owner@example.com', isAnonymous: false },
          csrfToken: 'runtime-csrf',
        },
      })
      .mockResolvedValueOnce({ status: 204, data: null });
    const repository = new ApiRuntimePreviewRepository(client(vi.fn()), client(runtimePost));

    await expect(repository.verifyCode('app_preview', 'owner@example.com', '123456'))
      .resolves.toEqual({ id: 'runtime_user', email: 'owner@example.com', isAnonymous: false });
    await repository.logout('app_preview');

    expect(runtimePost.mock.calls[1]?.[2]).toMatchObject({
      withCredentials: true,
      headers: { 'X-CSRF-Token': 'runtime-csrf' },
    });
  });
});
