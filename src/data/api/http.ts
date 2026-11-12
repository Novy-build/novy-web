import type { AxiosRequestConfig } from 'axios';

/** Minimal Axios-shaped response used by API repositories and their tests. */
export interface ApiHttpResponse {
  status: number;
  data: unknown;
  headers?: Record<string, unknown>;
}

/** Narrow HTTP contract shared by project, app-data, and import repositories. */
export interface ApiHttpClient {
  get(url: string, config?: AxiosRequestConfig): Promise<ApiHttpResponse>;
  post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiHttpResponse>;
  put(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiHttpResponse>;
  patch(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiHttpResponse>;
  delete(url: string, config?: AxiosRequestConfig): Promise<ApiHttpResponse>;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readApiErrorEnvelope(value: unknown): ApiErrorEnvelope | null {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }
  if (typeof value.error.code !== 'string' || typeof value.error.message !== 'string') {
    return null;
  }
  return value as unknown as ApiErrorEnvelope;
}

export function firstIssueMessage(envelope: ApiErrorEnvelope | null): string | null {
  const details = envelope?.error.details;
  if (!isRecord(details) || !Array.isArray(details.issues)) {
    return null;
  }
  const first: unknown = details.issues[0];
  return isRecord(first) && typeof first.message === 'string' ? first.message : null;
}
