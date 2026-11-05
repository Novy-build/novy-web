import type { User } from '@domain/entities/user';
import { AuthError } from '@domain/errors/AuthError';
import type { AuthRepository, SignInInput, SignUpInput } from '@domain/repositories/auth.repository';

export interface StubAuthOptions {
  /** Initial session state (missing key omitted means "anonymous"). */
  sessionUser?: User | null;
  knownEmail?: string;
  knownPassword?: string;
  knownDisplayName?: string;
}

/**
 * In-memory AuthRepository stub for tests: no localStorage, no latency, and
 * the same AuthError semantics as the real mock implementation.
 */
export function createStubAuthRepository(options: StubAuthOptions = {}): AuthRepository {
  const knownEmail = options.knownEmail ?? 'student@novy.app';
  const knownPassword = options.knownPassword ?? 'secret123';
  const knownDisplayName = options.knownDisplayName ?? 'Student Tester';
  const demoUser: User = { id: 'user_demo', displayName: 'Demo User', email: 'demo@novy.app' };

  let session: User | null = options.sessionUser ?? null;

  return {
    async getSession(): Promise<User | null> {
      return session;
    },

    async signIn(input: SignInInput): Promise<User> {
      if (input.email.trim().toLowerCase() !== knownEmail.toLowerCase()) {
        throw new AuthError('unknown-email');
      }
      if (input.password !== knownPassword) {
        throw new AuthError('wrong-password');
      }
      session = { id: 'user_stub', displayName: knownDisplayName, email: knownEmail };
      return session;
    },

    async signUp(input: SignUpInput): Promise<User> {
      if (input.email.trim().toLowerCase() === knownEmail.toLowerCase()) {
        throw new AuthError('email-taken');
      }
      session = { id: 'user_stub_new', displayName: input.displayName, email: input.email.trim().toLowerCase() };
      return session;
    },

    async signInDemoUser(): Promise<User> {
      session = demoUser;
      return session;
    },

    async signOut(): Promise<void> {
      session = null;
    },
  };
}
