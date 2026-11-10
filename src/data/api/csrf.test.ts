import { describe, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import {
  attachCsrfHeader,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  getCsrfTokenForMethod,
  readCookieValue,
} from './csrf';

describe('readCookieValue', () => {
  it('finds a cookie among others', () => {
    expect(readCookieValue('novy_csrf', 'theme=dark; novy_csrf=abc123; other=1')).toBe('abc123');
  });

  it('decodes percent-encoded values', () => {
    expect(readCookieValue('novy_csrf', 'novy_csrf=abc%20def')).toBe('abc def');
  });

  it('does not match cookie names by prefix', () => {
    expect(readCookieValue('novy_csrf', 'novy_csrf_old=stale')).toBeNull();
  });

  it('returns null when the cookie is missing', () => {
    expect(readCookieValue('novy_csrf', 'theme=dark')).toBeNull();
  });
});

describe('getCsrfTokenForMethod', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('returns the token for %s', (method) => {
    expect(getCsrfTokenForMethod(method, `${CSRF_COOKIE_NAME}=token`)).toBe('token');
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('returns null for the safe %s method', (method) => {
    expect(getCsrfTokenForMethod(method, `${CSRF_COOKIE_NAME}=token`)).toBeNull();
  });

  it('returns null when the method is unknown', () => {
    expect(getCsrfTokenForMethod(undefined, `${CSRF_COOKIE_NAME}=token`)).toBeNull();
  });
});

describe('attachCsrfHeader', () => {
  it('mirrors the cookie into the request header for mutations', () => {
    const config: InternalAxiosRequestConfig = {
      method: 'post',
      url: '/auth/logout',
      headers: new AxiosHeaders(),
    };

    attachCsrfHeader(config, `${CSRF_COOKIE_NAME}=token-value`);

    expect(config.headers.get(CSRF_HEADER_NAME)).toBe('token-value');
  });

  it('leaves read-only requests untouched', () => {
    const config: InternalAxiosRequestConfig = {
      method: 'get',
      url: '/auth/session',
      headers: new AxiosHeaders(),
    };

    attachCsrfHeader(config, `${CSRF_COOKIE_NAME}=token-value`);

    expect(config.headers.has(CSRF_HEADER_NAME)).toBe(false);
  });
});
