import type { ActionPayload } from '@domain/entities/logic';

export interface RuntimePreviewSession {
  appId: string;
}

export interface RuntimePreviewUser {
  id: string;
  email: string;
}

export interface RuntimePreviewRepository {
  readonly isAvailable: boolean;
  prepare(manifest: unknown): Promise<RuntimePreviewSession>;
  resetData(projectId: string): Promise<number>;
  execute(
    appId: string,
    actionId: string,
    payload: ActionPayload,
    inputs: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>>;
  uploadDocument(
    appId: string,
    actionId: string,
    inputs: Readonly<Record<string, unknown>>,
    file: File,
  ): Promise<Record<string, unknown>>;
  executeVision(
    appId: string,
    actionId: string,
    inputs: Readonly<Record<string, unknown>>,
    media: File,
  ): Promise<Record<string, unknown>>;
  requestCode(appId: string, email: string): Promise<void>;
  verifyCode(appId: string, email: string, code: string): Promise<RuntimePreviewUser>;
  getSession(appId: string): Promise<RuntimePreviewUser | null>;
  logout(appId: string): Promise<void>;
}

export class RuntimePreviewError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'RuntimePreviewError';
  }
}
