import type { User } from '@domain/entities/user';
import { createLocalRepositories, type Repositories } from '@data/repositories/local';
import { createStubAuthRepository, type StubAuthOptions } from './stubAuthRepository';

export type { StubAuthOptions } from './stubAuthRepository';

/**
 * Composes the default localStorage repositories with a stub auth repository.
 * Tests that need full isolation call `window.localStorage.clear()` in their
 * beforeEach (the local repositories touch shared browser storage).
 */
export function createStubRepositories(options: StubAuthOptions = {}): Repositories {
  return {
    ...createLocalRepositories({ latencyMs: 0 }),
    auth: createStubAuthRepository(options),
  };
}

export const STUB_USER: User = {
  id: 'user_stub',
  displayName: 'Student Tester',
  email: 'student@novy.app',
};
