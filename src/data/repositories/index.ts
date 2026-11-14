import { axiosClient } from '../api/axiosClient';
import type { ApiHttpClient } from '../api/http';
import { ApiAppDataRepository } from './api/ApiAppDataRepository';
import { ApiDeploymentRepository } from './api/ApiDeploymentRepository';
import { ApiAuthRepository, type AuthHttpClient } from './api/ApiAuthRepository';
import { ApiProjectImportRepository } from './api/ApiProjectImportRepository';
import { ApiProjectRepository } from './api/ApiProjectRepository';
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
  /**
   * Explicit client for projects and app data, or `null` to keep them in
   * localStorage. When omitted, VITE_API_BASE_URL decides.
   */
  projectClient?: ApiHttpClient | null;
}

/**
 * Composition root for the data layer. Auth, projects, app data, and source
 * export switch to the API when a backend base URL is configured; templates
 * and deployments stay local until their backend milestones. The local
 * project repositories are still constructed so their data can be imported
 * into the authenticated account.
 */
export function createRepositories(options?: RepositoriesOptions): Repositories {
  const local = createLocalRepositories(options);
  const hasApi = Boolean(import.meta.env.VITE_API_BASE_URL);
  const authClient =
    options?.authClient !== undefined ? options.authClient : hasApi ? axiosClient : null;
  const exportClient =
    options?.exportClient !== undefined ? options.exportClient : hasApi ? axiosClient : null;
  const projectClient =
    options?.projectClient !== undefined ? options.projectClient : hasApi ? axiosClient : null;

  return {
    ...local,
    ...(authClient ? { auth: new ApiAuthRepository(authClient) } : {}),
    ...(exportClient ? { reactExport: new ApiReactExportRepository(exportClient) } : {}),
    ...(projectClient
      ? {
          projects: new ApiProjectRepository(projectClient),
          appData: new ApiAppDataRepository(projectClient),
          deployments: new ApiDeploymentRepository(projectClient),
          localProjectImport: new ApiProjectImportRepository(
            projectClient,
            local.projects,
            local.appData,
            window.localStorage,
          ),
        }
      : {}),
  };
}
