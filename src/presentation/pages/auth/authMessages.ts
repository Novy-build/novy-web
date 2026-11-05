import { AuthError } from '@domain/errors/AuthError';

const AUTH_ERROR_COPY: Record<AuthError['code'], string> = {
  'unknown-email': "We couldn't find an account with that email.",
  'wrong-password': 'That password is incorrect. Please try again.',
  'email-taken': 'An account with this email already exists. Try logging in instead.',
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
