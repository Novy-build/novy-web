import type { User } from '../entities/user';

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

/**
 * Authentication contract. The local implementation simulates accounts for
 * frontend-only development; the API-backed implementation talks to the Novy
 * backend, which owns the Supabase session in HttpOnly cookies. No tokens are
 * ever stored client-side.
 */
export interface AuthRepository {
  /** Whether this implementation can create the local one-click demo session. */
  readonly supportsDemo: boolean;
  getSession(): Promise<User | null>;
  signIn(input: SignInInput): Promise<User>;
  signUp(input: SignUpInput): Promise<User>;
  /** One-click demo session so every screen stays reachable without creds. */
  signInDemoUser(): Promise<User>;
  signOut(): Promise<void>;
}
