import { beforeEach, describe, expect, it } from 'vitest';
import { LocalAuthRepository } from './LocalAuthRepository';
import { AuthError } from '@domain/errors/AuthError';

beforeEach(() => {
  window.localStorage.clear();
});

function createRepository(): LocalAuthRepository {
  return new LocalAuthRepository(window.localStorage, { delayMs: 0 });
}

describe('localStorage sessions', () => {
  it('has no session on a fresh install', async () => {
    expect(await createRepository().getSession()).toBeNull();
  });

  it('starts and restores a demo session', async () => {
    const repository = createRepository();
    const user = await repository.signInDemoUser();

    expect(user).toEqual({ id: 'user_demo', displayName: 'Demo User', email: 'demo@novy.app' });
    expect(await repository.getSession()).toEqual(user);

    // A fresh instance (page reload) restores the session.
    expect(await createRepository().getSession()).toEqual(user);
  });

  it('clears the session on sign-out', async () => {
    const repository = createRepository();
    await repository.signInDemoUser();

    await repository.signOut();

    expect(await repository.getSession()).toBeNull();
  });
});

describe('sign in', () => {
  it('signs up and then signs back in with those credentials', async () => {
    const repository = createRepository();
    await repository.signUp({ displayName: 'Andrei', email: 'andrei@novy.app', password: 'pass1234' });
    await repository.signOut();

    const signedIn = await repository.signIn({ email: 'andrei@novy.app', password: 'pass1234' });
    expect(await repository.getSession()).toEqual(signedIn);
  });

  it('matches emails case-insensitively', async () => {
    const repository = createRepository();
    await repository.signUp({ displayName: 'Andrei', email: 'andrei@novy.app', password: 'pass1234' });
    await repository.signOut();

    const signedIn = await repository.signIn({ email: '  ANDREI@NOVY.APP ', password: 'pass1234' });
    expect(signedIn.email).toBe('andrei@novy.app');
  });

  it('rejects unknown emails with a generic typed error', async () => {
    const repository = createRepository();

    await expect(repository.signIn({ email: 'nobody@novy.app', password: 'pass1234' })).rejects.toThrow(
      new AuthError('invalid-credentials'),
    );
  });

  it('rejects wrong passwords with the same generic typed error', async () => {
    const repository = createRepository();
    await repository.signUp({ displayName: 'Andrei', email: 'andrei@novy.app', password: 'pass1234' });
    await repository.signOut();

    await expect(repository.signIn({ email: 'andrei@novy.app', password: 'nope-nope' })).rejects.toThrow(
      new AuthError('invalid-credentials'),
    );
  });
});

describe('sign up', () => {
  it('creates an account and signs the user in immediately', async () => {
    const repository = createRepository();

    const user = await repository.signUp({ displayName: 'Carl', email: 'Carl@Novy.App', password: 'pass1234' });

    expect(user).toEqual({ id: expect.anything(), displayName: 'Carl', email: 'carl@novy.app' });
    expect(await repository.getSession()).toEqual(user);

    const fresh = createRepository();
    expect(await fresh.getSession()).toEqual(user);
  });

  it('stores accounts so later sign-ins work', async () => {
    const repository = createRepository();
    await repository.signUp({ displayName: 'Carl', email: 'carl@novy.app', password: 'pass1234' });
    await repository.signOut();

    const signedIn = await repository.signIn({ email: 'carl@novy.app', password: 'pass1234' });
    expect(signedIn.displayName).toBe('Carl');
  });

  it('rejects duplicate emails regardless of case', async () => {
    const repository = createRepository();
    await repository.signUp({ displayName: 'Carl', email: 'carl@novy.app', password: 'pass1234' });
    await repository.signOut();

    await expect(
      repository.signUp({ displayName: 'Other Carl', email: 'CARL@NOVY.APP', password: 'pass5678' }),
    ).rejects.toThrow(new AuthError('email-taken'));
  });

  it('never exposes the password through the session', async () => {
    const repository = createRepository();

    const user = await repository.signUp({ displayName: 'Carl', email: 'carl@novy.app', password: 'pass1234' });

    expect(Object.keys(user)).toEqual(['id', 'displayName', 'email']);
  });
});
