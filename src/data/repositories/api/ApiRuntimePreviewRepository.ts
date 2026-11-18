import axios from 'axios';
import type { ActionPayload } from '@domain/entities/logic';
import {
  RuntimePreviewError,
  type RuntimePreviewRepository,
  type RuntimePreviewSession,
  type RuntimePreviewUser,
} from '@domain/repositories/runtimePreview.repository';
import type { ApiHttpClient } from '@data/api/http';
import { isRecord, readApiErrorEnvelope } from '@data/api/http';

export class ApiRuntimePreviewRepository implements RuntimePreviewRepository {
  readonly isAvailable = true;
  private readonly builderClient: ApiHttpClient;
  private readonly runtimeClient: ApiHttpClient;
  private runtimeCsrfToken = '';

  constructor(
    builderClient: ApiHttpClient,
    runtimeClient: ApiHttpClient,
  ) {
    this.builderClient = builderClient;
    this.runtimeClient = runtimeClient;
  }

  async prepare(manifest: unknown): Promise<RuntimePreviewSession> {
    try {
      const response = await this.builderClient.post('/exports/runtime-preview', manifest);
      if (!isRecord(response.data) || typeof response.data.appId !== 'string') {
        throw new Error('The backend returned an invalid runtime preview session.');
      }
      return { appId: response.data.appId };
    } catch (error) {
      throw mapRuntimeError(error, 'The real runtime preview could not be started.');
    }
  }

  async resetData(projectId: string): Promise<number> {
    try {
      const response = await this.builderClient.post('/exports/runtime-preview/reset', { projectId });
      if (!isRecord(response.data) || typeof response.data.clearedRecords !== 'number') {
        throw new Error('The backend returned an invalid preview reset response.');
      }
      return response.data.clearedRecords;
    } catch (error) {
      throw mapRuntimeError(error, 'Preview data could not be reset.');
    }
  }

  async execute(
    appId: string,
    actionId: string,
    _payload: ActionPayload,
    inputs: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/actions/${encodeURIComponent(actionId)}/execute`,
        { executionId: crypto.randomUUID(), inputs },
      );
      return readOutput(response.data);
    } catch (error) {
      throw mapRuntimeError(error, 'The runtime action failed.');
    }
  }

  async uploadDocument(
    appId: string,
    actionId: string,
    inputs: Readonly<Record<string, unknown>>,
    file: File,
  ): Promise<Record<string, unknown>> {
    const body = new FormData();
    body.set('executionId', crypto.randomUUID());
    body.set('inputs', JSON.stringify(inputs));
    body.set('file', file, file.name);
    try {
      const response = await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/actions/${encodeURIComponent(actionId)}/execute-upload`,
        body,
        { headers: { Accept: 'application/json' } },
      );
      return readOutput(response.data);
    } catch (error) {
      throw mapRuntimeError(error, 'The document could not be uploaded.');
    }
  }

  async executeVision(
    appId: string,
    actionId: string,
    inputs: Readonly<Record<string, unknown>>,
    media: File,
  ): Promise<Record<string, unknown>> {
    try {
      const challenge = await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/vision/challenges`,
        { actionId, inputs },
        this.credentialedConfig(),
      );
      if (!isRecord(challenge.data) || typeof challenge.data.challengeId !== 'string') {
        throw new Error('The backend returned an invalid vision challenge.');
      }
      const body = new FormData();
      body.set('executionId', crypto.randomUUID());
      body.set('challengeId', challenge.data.challengeId);
      body.set('inputs', JSON.stringify(inputs));
      body.set('media', media, media.name || 'capture.jpg');
      const response = await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/actions/${encodeURIComponent(actionId)}/execute-media`,
        body,
        this.credentialedConfig(),
      );
      return readOutput(response.data);
    } catch (error) {
      throw mapRuntimeError(error, 'The vision action failed.');
    }
  }

  async requestCode(appId: string, email: string): Promise<void> {
    try {
      await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/auth/code`,
        { email },
        { withCredentials: true },
      );
    } catch (error) {
      throw mapRuntimeError(error, 'The sign-in code could not be sent.');
    }
  }

  async verifyCode(appId: string, email: string, code: string): Promise<RuntimePreviewUser> {
    try {
      const response = await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/auth/code/verify`,
        { email, code },
        { withCredentials: true },
      );
      return this.readAuth(response.data);
    } catch (error) {
      throw mapRuntimeError(error, 'The sign-in code could not be verified.');
    }
  }

  async getSession(appId: string): Promise<RuntimePreviewUser | null> {
    try {
      const response = await this.runtimeClient.get(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/auth/session`,
        { withCredentials: true },
      );
      return this.readAuth(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.runtimeCsrfToken = '';
        return null;
      }
      throw mapRuntimeError(error, 'The app session could not be loaded.');
    }
  }

  async logout(appId: string): Promise<void> {
    try {
      await this.runtimeClient.post(
        `/runtime/v1/apps/${encodeURIComponent(appId)}/auth/logout`,
        undefined,
        this.credentialedConfig(),
      );
      this.runtimeCsrfToken = '';
    } catch (error) {
      throw mapRuntimeError(error, 'The app session could not be signed out.');
    }
  }

  private credentialedConfig() {
    return {
      withCredentials: true,
      headers: this.runtimeCsrfToken ? { 'X-CSRF-Token': this.runtimeCsrfToken } : {},
    };
  }

  private readAuth(value: unknown): RuntimePreviewUser {
    if (!isRecord(value) || !isRecord(value.user)
      || typeof value.user.id !== 'string' || typeof value.user.email !== 'string'
      || typeof value.csrfToken !== 'string') {
      throw new Error('The backend returned an invalid app session.');
    }
    this.runtimeCsrfToken = value.csrfToken;
    return {
      id: value.user.id,
      email: value.user.email,
      isAnonymous: value.user.isAnonymous === true,
    };
  }
}

function readOutput(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.output)) {
    throw new Error('The backend returned an invalid runtime action response.');
  }
  return value.output;
}

function mapRuntimeError(error: unknown, fallback: string): Error {
  if (error instanceof Error && !axios.isAxiosError(error)) return error;
  if (!axios.isAxiosError(error)) return new Error(fallback);
  const envelope = readApiErrorEnvelope(error.response?.data);
  if (envelope?.error.code === 'rag_provider_unavailable') {
    return new RuntimePreviewError(
      envelope.error.code,
      'The selected RAG provider is unavailable. If this app uses local Ollama, start Ollama and try again.',
    );
  }
  return new RuntimePreviewError(
    envelope?.error.code ?? 'runtime_request_failed',
    envelope?.error.message ?? fallback,
  );
}
