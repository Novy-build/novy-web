const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message, or null when the value is acceptable. */
export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Enter your name.';
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Enter your email.';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address, like you@example.com.';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) {
    return 'Use at least 8 characters.';
  }
  if (!/\d/.test(value)) {
    return 'Include at least one number.';
  }
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (confirm.length === 0) {
    return 'Confirm your password.';
  }
  if (password !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}

/** Validates non-empty sign-in fields without strength rules. */
export function validateSignInCredentials(value: string, label: string): string | null {
  if (value.trim().length === 0) {
    return `Enter your ${label}.`;
  }
  return null;
}
