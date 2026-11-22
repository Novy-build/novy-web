import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiAuthRepository, type AuthHttpClient } from './ApiAuthRepository';

const USER = { id: 'user_1', displayName: 'Ada', email: 'ada@novy.app' };

function response(data: unknown, status = 200): { status: number; data: unknown } {
  return { status, data };
}

function apiFailure(status: number, code: string): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    data: { error: { code, message: 'Request failed.' } },
    status,
    statusText: 'Error',
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return error;
}

function makeClient(): {
  client: AuthHttpClient;
  get: ReturnType<typeof vi.fn<AuthHttpClient['get']>>;
  post: ReturnType<typeof vi.fn<AuthHttpClient['post']>>;
} {
  const get = vi.fn<AuthHttpClient['get']>();
  const post = vi.fn<AuthHttpClient['post']>();
  get.mockResolvedValue(response({ csrfToken: 'token' }));
  return { client: { get, post }, get, post };
}

describe('ApiAuthRepository session', () => {
  it('restores the current user from the cookie session', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue(response(USER));

    await expect(new ApiAuthRepository(client).getSession()).resolves.toEqual(USER);
    expect(get).toHaveBeenCalledWith('/auth/session');
  });

  it('deduplicates concurrent session restoration', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValue(response(USER));
    const repository = new ApiAuthRepository(client);

    const [first, second] = await Promise.all([
      repository.getSession(),
      repository.getSession(),
    ]);

    expect(first).toEqual(USER);
    expect(second).toEqual(USER);
    expect(get).toHaveBeenCalledOnce();
  });

  it('treats a 401 as an anonymous visitor', async () => {
    const { client, get } = makeClient();
    get.mockRejectedValue(apiFailure(401, 'session_required'));

    await expect(new ApiAuthRepository(client).getSession()).resolves.toBeNull();
  });

  it('reports an unavailable backend when the network request fails', async () => {
    const { client, get } = makeClient();
    get.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    await expect(new ApiAuthRepository(client).getSession()).rejects.toMatchObject({
      code: 'unavailable',
    });
  });
});

afterEach(() => {
  document.cookie = 'novy_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('ApiAuthRepository CSRF bootstrap', () => {
  it('bootstraps CSRF before the first state-changing request', async () => {
    const { client, get, post } = makeClient();
    get.mockResolvedValue(response({ csrfToken: 'token' }));
    post.mockResolvedValue(response(USER));

    await new ApiAuthRepository(client).signIn({ email: 'ada@novy.app', password: 'secret123' });

    expect(get).toHaveBeenCalledWith('/auth/csrf');
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(post.mock.invocationCallOrder[0] ?? 0);
  });

  it('skips bootstrap when the CSRF cookie is already present', async () => {
    document.cookie = 'novy_csrf=existing';
    const { client, get, post } = makeClient();
    post.mockResolvedValue(response(USER));

    await new ApiAuthRepository(client).signIn({ email: 'ada@novy.app', password: 'secret123' });

    expect(get).not.toHaveBeenCalled();
  });
});

describe('ApiAuthRepository sign-in', () => {
  it('posts credentials and maps the returned user', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue(response(USER));

    await expect(
      new ApiAuthRepository(client).signIn({ email: 'ada@novy.app', password: 'secret123' }),
    ).resolves.toEqual(USER);
    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@novy.app',
      password: 'secret123',
    });
  });

  it.each([
    ['invalid_credentials', 'invalid-credentials'],
    ['email_not_confirmed', 'email-confirmation-required'],
    ['rate_limited', 'rate-limited'],
    ['auth_provider_rate_limited', 'rate-limited'],
    ['auth_provider_unavailable', 'unavailable'],
    ['auth_not_configured', 'unavailable'],
  ])('maps the %s API code to %s', async (apiCode, authCode) => {
    const { client, post } = makeClient();
    post.mockRejectedValue(apiFailure(401, apiCode));

    await expect(
      new ApiAuthRepository(client).signIn({ email: 'ada@novy.app', password: 'wrong' }),
    ).rejects.toMatchObject({ code: authCode });
  });

  it('maps an unknown API failure to a generic typed error', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(apiFailure(500, 'internal_error'));

    await expect(
      new ApiAuthRepository(client).signIn({ email: 'ada@novy.app', password: 'secret123' }),
    ).rejects.toMatchObject({ code: 'unexpected' });
  });

  it('rejects malformed success payloads instead of trusting them', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue(response({ id: 'user_1' }));

    await expect(
      new ApiAuthRepository(client).signIn({ email: 'ada@novy.app', password: 'secret123' }),
    ).rejects.toMatchObject({ code: 'unexpected' });
  });
});

describe('ApiAuthRepository sign-up', () => {
  it('maps a created account with an immediate session', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue(response(USER, 201));

    await expect(
      new ApiAuthRepository(client).signUp({
        displayName: 'Ada',
        email: 'ada@novy.app',
        password: 'secret123',
      }),
    ).resolves.toEqual(USER);
  });

  it('reports pending email confirmation without adopting a session', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue(
      response({ user: USER, requiresEmailConfirmation: true }, 202),
    );

    await expect(
      new ApiAuthRepository(client).signUp({
        displayName: 'Ada',
        email: 'ada@novy.app',
        password: 'secret123',
      }),
    ).rejects.toMatchObject({ code: 'email-confirmation-required' });
  });

  it('maps a duplicate registration to email-taken', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(apiFailure(409, 'email_already_registered'));

    await expect(
      new ApiAuthRepository(client).signUp({
        displayName: 'Ada',
        email: 'ada@novy.app',
        password: 'secret123',
      }),
    ).rejects.toMatchObject({ code: 'email-taken' });
  });
});

describe('ApiAuthRepository sign-out and demo', () => {
  it('posts to the logout endpoint', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValue(response(null, 204));

    await expect(new ApiAuthRepository(client).signOut()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/auth/logout');
  });

  it('treats an already-cleared or CSRF-failed session as signed out', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(apiFailure(403, 'csrf_failed'));

    await expect(new ApiAuthRepository(client).signOut()).resolves.toBeUndefined();
  });

  it('reports an unavailable backend during logout', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    await expect(new ApiAuthRepository(client).signOut()).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('never exposes the local demo shortcut through the API', async () => {
    const { client } = makeClient();
    const repository = new ApiAuthRepository(client);

    expect(repository.supportsDemo).toBe(false);
    await expect(repository.signInDemoUser()).rejects.toMatchObject({ code: 'demo-unavailable' });
  });
});
