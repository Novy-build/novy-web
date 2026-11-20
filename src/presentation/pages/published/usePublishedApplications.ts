import { useCallback, useEffect, useState } from 'react';
import type { PublishedApplication } from '@domain/entities/deployment';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export interface PublishedApplicationsState {
  applications: PublishedApplication[];
  isLoading: boolean;
  hasFailed: boolean;
  reload: () => void;
}

/** Loads the owner-wide publishing summary through the deployment repository port. */
export function usePublishedApplications(): PublishedApplicationsState {
  const { deployments } = useRepositories();
  const [applications, setApplications] = useState<PublishedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasFailed(false);

    void deployments
      .listPublishedApplications()
      .then((items) => {
        if (active) {
          setApplications(items);
        }
      })
      .catch(() => {
        if (active) {
          setHasFailed(true);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [deployments, attempt]);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { applications, isLoading, hasFailed, reload };
}
