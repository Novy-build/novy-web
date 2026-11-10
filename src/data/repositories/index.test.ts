import { describe, expect, it } from 'vitest';
import { ApiAuthRepository, type AuthHttpClient } from './api/ApiAuthRepository';
import { createRepositories } from './index';
import { LocalAuthRepository } from './local/LocalAuthRepository';
import { ApiReactExportRepository, type ReactExportHttpClient } from './api/ApiReactExportRepository';
import { UnavailableReactExportRepository } from './local/UnavailableReactExportRepository';

const authClient: AuthHttpClient = {
  get: async () => ({ status: 200, data: null }),
  post: async () => ({ status: 204, data: null }),
};
const exportClient: ReactExportHttpClient = {
  post: async () => ({ data: new ArrayBuffer(0), headers: {} }),
};

describe('createRepositories', () => {
  it('keeps the local auth repository when no API client is configured', () => {
    const repositories = createRepositories({
      latencyMs: 0,
      authClient: null,
      exportClient: null,
    });

    expect(repositories.auth).toBeInstanceOf(LocalAuthRepository);
    expect(repositories.auth.supportsDemo).toBe(true);
    expect(repositories.reactExport).toBeInstanceOf(UnavailableReactExportRepository);
  });

  it('swaps only auth when an API client is configured', () => {
    const repositories = createRepositories({ latencyMs: 0, authClient });

    expect(repositories.auth).toBeInstanceOf(ApiAuthRepository);
    expect(repositories.auth.supportsDemo).toBe(false);
    expect(repositories.projects.constructor.name).toBe('LocalStorageProjectRepository');
    expect(repositories.appData.constructor.name).toBe('LocalStorageAppDataRepository');
  });

  it('enables backend React export when an export client is configured', () => {
    const repositories = createRepositories({
      latencyMs: 0,
      authClient: null,
      exportClient,
    });

    expect(repositories.reactExport).toBeInstanceOf(ApiReactExportRepository);
    expect(repositories.auth).toBeInstanceOf(LocalAuthRepository);
  });
});
