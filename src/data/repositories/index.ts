import { axiosClient } from '../api/axiosClient';
import { ApiAuthRepository, type AuthHttpClient } from './api/ApiAuthRepository';
import {
  ApiReactExportRepository,
  type ReactExportHttpClient,
} from './api/ApiReactExportRepository';
import { createLocalRepositories, type LocalRepositoriesOptions, type Repositories } from './local';

export type { Repositories } from './local';

export interface RepositoriesOptions extends LocalRepositoriesOptions {
  /**
   * Explicit API client (tests/embedding), or `null` to force local auth.
   * When omitted, VITE_API_BASE_URL decides.
   */
  authClient?: AuthHttpClient | null;
  /** Explicit export client, or `null` to keep source export unavailable. */
  exportClient?: ReactExportHttpClient | null;
}

/**
 * Composition root for the data layer. Project, template, deployment, and app
 * data repositories remain local until their backend milestones; auth switches
 * to the API when a backend base URL is configured.
 */
export function createRepositories(options?: RepositoriesOptions): Repositories {
  const local = createLocalRepositories(options);
  const authClient =
    options?.authClient !== undefined
      ? options.authClient
      : import.meta.env.VITE_API_BASE_URL
        ? axiosClient
        : null;
  const exportClient =
    options?.exportClient !== undefined
      ? options.exportClient
      : import.meta.env.VITE_API_BASE_URL
        ? axiosClient
        : null;
  return {
    ...local,
    ...(authClient ? { auth: new ApiAuthRepository(authClient) } : {}),
    ...(exportClient ? { reactExport: new ApiReactExportRepository(exportClient) } : {}),
  };
}
