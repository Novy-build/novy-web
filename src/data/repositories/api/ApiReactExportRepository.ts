import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { ExportError } from '@domain/errors/ExportError';
import type {
  ReactExportArchive,
  ReactExportRepository,
} from '@domain/repositories/reactExport.repository';

interface ExportHttpResponse {
  data: unknown;
  headers: Record<string, unknown>;
}

export interface ReactExportHttpClient {
  post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ExportHttpResponse>;
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiReactExportRepository implements ReactExportRepository {
  readonly isAvailable = true;

  private readonly client: ReactExportHttpClient;

  constructor(client: ReactExportHttpClient) {
    this.client = client;
  }

  async exportReact(manifest: unknown): Promise<ReactExportArchive> {
    try {
      const response = await this.client.post('/exports/react', manifest, {
        responseType: 'arraybuffer',
        timeout: 30_000,
      });
      if (!(response.data instanceof ArrayBuffer)) {
        throw new ExportError('generation', 'The backend returned an invalid export archive.');
      }
      return {
        filename: parseFilename(response.headers['content-disposition']),
        content: response.data,
      };
    } catch (error) {
      if (error instanceof ExportError) throw error;
      throw await mapApiExportError(error);
    }
  }
}

async function mapApiExportError(error: unknown): Promise<ExportError> {
  if (!axios.isAxiosError(error)) return new ExportError('unexpected');
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new ExportError('timeout', 'The export request timed out. Try again.');
    }
    return new ExportError('network', 'The backend could not be reached. Try again.');
  }

  const envelope = await parseErrorEnvelope(error.response.data);
  const message = envelope?.error.message;
  switch (envelope?.error.code) {
    case 'invalid_manifest':
    case 'validation_error':
      return new ExportError('validation', firstIssueMessage(envelope) ?? message);
    case 'generation_timeout':
      return new ExportError('timeout', message);
    case 'generation_failed':
      return new ExportError('generation', message);
    case 'rate_limited':
      return new ExportError('rate-limited', message);
    case 'session_required':
    case 'invalid_session':
      return new ExportError('session-expired', message);
    case 'auth_not_configured':
    case 'auth_provider_unavailable':
      return new ExportError('unavailable', message);
    default:
      return new ExportError('unexpected', message);
  }
}

async function parseErrorEnvelope(value: unknown): Promise<ApiErrorEnvelope | null> {
  let parsed: unknown = value;
  if (value instanceof ArrayBuffer) {
    try {
      parsed = JSON.parse(new TextDecoder().decode(value));
    } catch {
      return null;
    }
  } else if (value instanceof Blob) {
    try {
      parsed = JSON.parse(await value.text());
    } catch {
      return null;
    }
  }
  if (!isRecord(parsed) || !isRecord(parsed.error)) return null;
  if (typeof parsed.error.code !== 'string' || typeof parsed.error.message !== 'string') {
    return null;
  }
  return parsed as unknown as ApiErrorEnvelope;
}

function firstIssueMessage(envelope: ApiErrorEnvelope): string | null {
  const details = envelope.error.details;
  if (!isRecord(details) || !Array.isArray(details.issues)) return null;
  const first: unknown = details.issues[0];
  return isRecord(first) && typeof first.message === 'string' ? first.message : null;
}

function parseFilename(value: unknown): string {
  if (typeof value !== 'string') return 'novy-react-app.zip';
  const match = /filename="?([^";]+)"?/i.exec(value);
  const candidate = match?.[1]?.trim();
  return candidate && /^[A-Za-z0-9._-]+\.zip$/.test(candidate)
    ? candidate
    : 'novy-react-app.zip';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
