import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@domain/entities/user';
import type { SessionStatus } from './sessionStatus';
import type { SignInInput, SignUpInput } from '@domain/repositories/auth.repository';
import { useRepositories } from './RepositoriesProvider';

export interface SessionContextValue {
  readonly user: User | null;
  readonly status: SessionStatus;
  signIn(input: SignInInput): Promise<User>;
  signUp(input: SignUpInput): Promise<User>;
  continueAsDemo(): Promise<User>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Session state backed by the (mock) AuthRepository. Loads the persisted
 * session on mount; sign-in/sign-up members update it in place so the route
 * guard reacts without a refresh.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useRepositories();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let active = true;
    void auth
      .getSession()
      .then((sessionUser) => {
        if (!active) {
          return;
        }
        setUser(sessionUser);
        setStatus(sessionUser ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) {
          setStatus('anonymous');
        }
      });
    return () => {
      active = false;
    };
  }, [auth]);

  const adoptUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const signIn = useCallback(
    async (input: SignInInput): Promise<User> => {
      const nextUser = await auth.signIn(input);
      adoptUser(nextUser);
      return nextUser;
    },
    [auth, adoptUser],
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<User> => {
      const nextUser = await auth.signUp(input);
      adoptUser(nextUser);
      return nextUser;
    },
    [auth, adoptUser],
  );

  const continueAsDemo = useCallback(async (): Promise<User> => {
    const demoUser = await auth.signInDemoUser();
    adoptUser(demoUser);
    return demoUser;
  }, [auth, adoptUser]);

  const signOut = useCallback(async (): Promise<void> => {
    await auth.signOut();
    setUser(null);
    setStatus('anonymous');
  }, [auth]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, status, signIn, signUp, continueAsDemo, signOut }),
    [user, status, signIn, signUp, continueAsDemo, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a SessionProvider.');
  }
  return value;
}
