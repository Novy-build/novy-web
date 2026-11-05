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
 * Authentication contract. The mock implementation (data layer) simulates
 * accounts and a session for the frontend-only phase; the API-backed
 * implementation arrives with the backend phase. No tokens are ever stored
 * client-side.
 */
export interface AuthRepository {
  getSession(): Promise<User | null>;
  signIn(input: SignInInput): Promise<User>;
  signUp(input: SignUpInput): Promise<User>;
  /** One-click demo session so every screen stays reachable without creds. */
  signInDemoUser(): Promise<User>;
  signOut(): Promise<void>;
}
