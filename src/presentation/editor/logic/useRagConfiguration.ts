import { useEffect, useState } from 'react';
import type { RagFileSource, RagProfile } from '@domain/entities/rag';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export interface RagConfigurationState {
  profiles: RagProfile[];
  fileSources: RagFileSource[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Loads backend-owned RAG connection profiles and project file sources.
 *
 * Profiles and files live on the backend, so the editor only ever stores their
 * identifiers in Project JSON. Failures are surfaced as a message instead of
 * blocking the inspector.
 */
export function useRagConfiguration(projectId: string | undefined): RagConfigurationState {
  const { rag } = useRepositories();
  const [profiles, setProfiles] = useState<RagProfile[]>([]);
  const [fileSources, setFileSources] = useState<RagFileSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!projectId) {
      setProfiles([]);
      setFileSources([]);
      return () => {
        active = false;
      };
    }
    setIsLoading(true);
    setError(null);
    Promise.all([rag.listProfiles(), rag.listFileSources(projectId)])
      .then(([loadedProfiles, loadedFiles]) => {
        if (!active) return;
        setProfiles(loadedProfiles);
        setFileSources(loadedFiles);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setProfiles([]);
        setFileSources([]);
        setError(cause instanceof Error ? cause.message : 'RAG configuration could not be loaded.');
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, rag]);

  return { profiles, fileSources, isLoading, error };
}
