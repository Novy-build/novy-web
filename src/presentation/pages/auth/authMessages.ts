import { AuthError } from '@domain/errors/AuthError';

const AUTH_ERROR_COPY: Record<AuthError['code'], string> = {
  'invalid-credentials': 'Incorrect email or password. Please try again.',
  'email-taken': 'An account with this email already exists. Try logging in instead.',
  'email-confirmation-required':
    'Your account was created. Check your inbox to confirm your email, then log in.',
  'session-expired': 'Your session has expired. Please log in again.',
  'rate-limited': 'Too many attempts. Please wait a moment and try again.',
  unavailable: 'Authentication is temporarily unavailable. Please try again.',
  'demo-unavailable': 'Demo access is not available in this environment.',
  unexpected: 'Something went wrong on our side. Please try again.',
};

/**
 * Maps typed domain auth failures to friendly copy; anything unexpected
 * becomes a generic, honest message rather than leaking internals.
 */
export function formatAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    return AUTH_ERROR_COPY[error.code];
  }
  console.warn('[novy] unexpected auth failure:', error);
  return 'Something went wrong on our side. Please try again.';
}
