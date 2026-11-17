import type { ActionPayload } from '@domain/entities/logic';
import type {
  RuntimePreviewRepository,
  RuntimePreviewSession,
  RuntimePreviewUser,
} from '@domain/repositories/runtimePreview.repository';

export class UnavailableRuntimePreviewRepository implements RuntimePreviewRepository {
  readonly isAvailable = false;

  async prepare(_manifest: unknown): Promise<RuntimePreviewSession> {
    throw new Error('Configure VITE_API_BASE_URL to run the app against the real backend runtime.');
  }

  async resetData(_projectId: string): Promise<number> {
    throw new Error('The real runtime preview is unavailable.');
  }

  async execute(
    _appId: string,
    _actionId: string,
    _payload: ActionPayload,
    _inputs: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    throw new Error('The real runtime preview is unavailable.');
  }

  async uploadDocument(
    _appId: string,
    _actionId: string,
    _inputs: Readonly<Record<string, unknown>>,
    _file: File,
  ): Promise<Record<string, unknown>> {
    throw new Error('The real runtime preview is unavailable.');
  }

  async executeVision(
    _appId: string,
    _actionId: string,
    _inputs: Readonly<Record<string, unknown>>,
    _media: File,
  ): Promise<Record<string, unknown>> {
    throw new Error('The real runtime preview is unavailable.');
  }

  async requestCode(_appId: string, _email: string): Promise<void> {
    throw new Error('The real runtime preview is unavailable.');
  }

  async verifyCode(_appId: string, _email: string, _code: string): Promise<RuntimePreviewUser> {
    throw new Error('The real runtime preview is unavailable.');
  }

  async getSession(_appId: string): Promise<RuntimePreviewUser | null> {
    return null;
  }

  async logout(_appId: string): Promise<void> {
    throw new Error('The real runtime preview is unavailable.');
  }
}
