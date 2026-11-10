import type { InternalAxiosRequestConfig } from 'axios';

export const CSRF_COOKIE_NAME = 'novy_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Reads one cookie from a `document.cookie`-style header string. */
export function readCookieValue(name: string, cookieHeader: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    if (key !== name) {
      continue;
    }
    const rawValue = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}

/** Double-submit token is only relevant for state-changing requests. */
export function getCsrfTokenForMethod(
  method: string | undefined,
  cookieHeader: string,
): string | null {
  if (!method || !UNSAFE_METHODS.has(method.toUpperCase())) {
    return null;
  }
  return readCookieValue(CSRF_COOKIE_NAME, cookieHeader);
}

function readDocumentCookie(): string {
  return typeof document === 'undefined' ? '' : document.cookie;
}

/**
 * Attaches the readable `novy_csrf` cookie as the `X-CSRF-Token` header.
 * The backend uses a double-submit check for cookie-authenticated mutations.
 */
export function attachCsrfHeader(
  config: InternalAxiosRequestConfig,
  cookieHeader: string = readDocumentCookie(),
): InternalAxiosRequestConfig {
  const token = getCsrfTokenForMethod(config.method, cookieHeader);
  if (token) {
    config.headers.set(CSRF_HEADER_NAME, token);
  }
  return config;
}
