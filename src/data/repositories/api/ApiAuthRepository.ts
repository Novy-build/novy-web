import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { User } from '@domain/entities/user';
import { AuthError } from '@domain/errors/AuthError';
import type { AuthRepository, SignInInput, SignUpInput } from '@domain/repositories/auth.repository';
import { mapUserDtoToEntity, parseUserDto } from '../../mappers/user.mapper';

const AUTH_BASE = '/auth';

/** Narrow HTTP contract so the repository can be tested without a network. */
export interface AuthHttpResponse {
  status: number;
  data: unknown;
}

export interface AuthHttpClient {
  get(url: string, config?: AxiosRequestConfig): Promise<AuthHttpResponse>;
  post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AuthHttpResponse>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRegistrationPending(value: unknown): boolean {
  return isRecord(value) && value.requiresEmailConfirmation === true;
}

function readApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  const data: unknown = error.response?.data;
  if (!isRecord(data) || !isRecord(data.error)) {
    return null;
  }
  return typeof data.error.code === 'string' ? data.error.code : null;
}

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function mapApiAuthError(error: unknown): AuthError {
  switch (readApiErrorCode(error)) {
    case 'invalid_credentials':
      return new AuthError('invalid-credentials');
    case 'email_already_registered':
      return new AuthError('email-taken');
    case 'email_not_confirmed':
      return new AuthError('email-confirmation-required');
    case 'rate_limited':
    case 'auth_provider_rate_limited':
      return new AuthError('rate-limited');
    case 'session_required':
    case 'invalid_session':
      return new AuthError('session-expired');
    case 'auth_provider_unavailable':
    case 'auth_not_configured':
      return new AuthError('unavailable');
    default:
      // A missing response means the request never reached the API.
      if (axios.isAxiosError(error) && !error.response) {
        return new AuthError('unavailable');
      }
      return new AuthError('unexpected');
  }
}

/**
 * API-backed authentication. The Novy backend exchanges Supabase tokens for
 * HttpOnly cookies, so this repository only moves user profiles around and
 * never sees or persists a token.
 */
export class ApiAuthRepository implements AuthRepository {
  readonly supportsDemo = false;

  private readonly client: AuthHttpClient;

  constructor(client: AuthHttpClient) {
    this.client = client;
  }

  async getSession(): Promise<User | null> {
    try {
      const response = await this.client.get(`${AUTH_BASE}/session`);
      return mapUserDtoToEntity(parseUserDto(response.data));
    } catch (error) {
      // Anonymous visitors are expected to receive 401 from /auth/session.
      if (isUnauthorized(error)) {
        return null;
      }
      throw mapApiAuthError(error);
    }
  }

  async signIn(input: SignInInput): Promise<User> {
    try {
      const response = await this.client.post(`${AUTH_BASE}/login`, input);
      return mapUserDtoToEntity(parseUserDto(response.data));
    } catch (error) {
      throw mapApiAuthError(error);
    }
  }

  async signUp(input: SignUpInput): Promise<User> {
    try {
      const response = await this.client.post(`${AUTH_BASE}/register`, input);
      if (isRegistrationPending(response.data)) {
        throw new AuthError('email-confirmation-required');
      }
      return mapUserDtoToEntity(parseUserDto(response.data));
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw mapApiAuthError(error);
    }
  }

  async signInDemoUser(): Promise<User> {
    throw new AuthError('demo-unavailable');
  }

  async signOut(): Promise<void> {
    try {
      await this.client.post(`${AUTH_BASE}/logout`);
    } catch (error) {
      // Already signed out, or the CSRF cookie is gone: cookies were not
      // established in the first place. Either way the local state can clear.
      if (isUnauthorized(error) || readApiErrorCode(error) === 'csrf_failed') {
        return;
      }
      throw mapApiAuthError(error);
    }
  }
}
