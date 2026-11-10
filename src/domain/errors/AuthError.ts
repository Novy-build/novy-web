export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-taken'
  | 'email-confirmation-required'
  | 'session-expired'
  | 'rate-limited'
  | 'unavailable'
  | 'demo-unavailable'
  | 'unexpected';

/**
 * Typed auth failure thrown by AuthRepository implementations.
 * The presentation layer maps codes to friendly copy (never guesses from raw
 * error strings).
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(`AuthError: ${code}`);
    this.name = 'AuthError';
    this.code = code;
  }
}
