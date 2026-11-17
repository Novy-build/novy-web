import { describe, expect, it } from 'vitest';
import type { ApiHttpClient } from '../api/http';
import { ApiAppDataRepository } from './api/ApiAppDataRepository';
import { ApiAuthRepository, type AuthHttpClient } from './api/ApiAuthRepository';
import { ApiProjectImportRepository } from './api/ApiProjectImportRepository';
import { ApiProjectRepository } from './api/ApiProjectRepository';
import { ApiRuntimePreviewRepository } from './api/ApiRuntimePreviewRepository';
import { ApiReactExportRepository, type ReactExportHttpClient } from './api/ApiReactExportRepository';
import { createRepositories } from './index';
import { LocalAuthRepository } from './local/LocalAuthRepository';
import { LocalStorageAppDataRepository } from './local/LocalStorageAppDataRepository';
import { LocalStorageProjectRepository } from './local/LocalStorageProjectRepository';
import { UnavailableReactExportRepository } from './local/UnavailableReactExportRepository';
import { UnavailableRuntimePreviewRepository } from './local/UnavailableRuntimePreviewRepository';

const authClient: AuthHttpClient = {
  get: async () => ({ status: 200, data: null }),
  post: async () => ({ status: 204, data: null }),
};
const exportClient: ReactExportHttpClient = {
  post: async () => ({ data: new ArrayBuffer(0), headers: {} }),
};
const projectClient: ApiHttpClient = {
  get: async () => ({ status: 200, data: null }),
  post: async () => ({ status: 201, data: null }),
  put: async () => ({ status: 200, data: null }),
  patch: async () => ({ status: 200, data: null }),
  delete: async () => ({ status: 204, data: null }),
};

describe('createRepositories', () => {
  it('keeps the local repositories when no API client is configured', () => {
    const repositories = createRepositories({
      latencyMs: 0,
      authClient: null,
      exportClient: null,
      projectClient: null,
    });

    expect(repositories.auth).toBeInstanceOf(LocalAuthRepository);
    expect(repositories.auth.supportsDemo).toBe(true);
    expect(repositories.projects).toBeInstanceOf(LocalStorageProjectRepository);
    expect(repositories.appData).toBeInstanceOf(LocalStorageAppDataRepository);
    expect(repositories.localProjectImport).toBeUndefined();
    expect(repositories.reactExport).toBeInstanceOf(UnavailableReactExportRepository);
    expect(repositories.runtimePreview).toBeInstanceOf(UnavailableRuntimePreviewRepository);
  });

  it('swaps auth, projects, app data, and import when an API client is configured', () => {
    const repositories = createRepositories({ latencyMs: 0, authClient, projectClient });

    expect(repositories.auth).toBeInstanceOf(ApiAuthRepository);
    expect(repositories.auth.supportsDemo).toBe(false);
    expect(repositories.projects).toBeInstanceOf(ApiProjectRepository);
    expect(repositories.appData).toBeInstanceOf(ApiAppDataRepository);
    expect(repositories.localProjectImport).toBeInstanceOf(ApiProjectImportRepository);
    expect(repositories.runtimePreview).toBeInstanceOf(ApiRuntimePreviewRepository);
  });

  it('keeps projects local when only auth is API-backed', () => {
    const repositories = createRepositories({
      latencyMs: 0,
      authClient,
      projectClient: null,
    });

    expect(repositories.auth).toBeInstanceOf(ApiAuthRepository);
    expect(repositories.projects).toBeInstanceOf(LocalStorageProjectRepository);
    expect(repositories.appData).toBeInstanceOf(LocalStorageAppDataRepository);
    expect(repositories.localProjectImport).toBeUndefined();
  });

  it('enables backend React export when an export client is configured', () => {
    const repositories = createRepositories({
      latencyMs: 0,
      authClient: null,
      exportClient,
      projectClient: null,
    });

    expect(repositories.reactExport).toBeInstanceOf(ApiReactExportRepository);
    expect(repositories.auth).toBeInstanceOf(LocalAuthRepository);
  });
});
