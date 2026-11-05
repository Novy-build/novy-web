import { createContext, useContext, useState, type ReactNode } from 'react';
import { createLocalRepositories, type Repositories } from '@data/repositories/local';

const RepositoriesContext = createContext<Repositories | null>(null);

interface RepositoriesProviderProps {
  children: ReactNode;
  /** Tests may inject a repository set; the default composes localStorage ones. */
  repositories?: Repositories;
}

/**
 * Main-layer dependency injection: repositories are created once (per mount)
 * here and consumed anywhere below via useRepositories(). Any consumer swap
 * between local and API-backed implementations happens here only. Demo-data
 * seeding is NOT a provider concern — index.tsx bootstraps it before the
 * first render, so data hooks never race their own seed.
 */
export function RepositoriesProvider({ children, repositories }: RepositoriesProviderProps) {
  const [value] = useState<Repositories>(() => repositories ?? createLocalRepositories());

  return <RepositoriesContext.Provider value={value}>{children}</RepositoriesContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (!repositories) {
    throw new Error('useRepositories must be used within a RepositoriesProvider.');
  }
  return repositories;
}
