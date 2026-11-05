import { useCallback, useEffect, useState } from 'react';
import type { Template } from '@domain/entities/template';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export interface TemplatesState {
  templates: Template[];
  isLoading: boolean;
  reload: () => void;
}

/**
 * Loads the New Project gallery catalog. The mock repository is static JSON,
 * so failures degrade to an empty-but-retryable gallery.
 */
export function useTemplates(): TemplatesState {
  const { templates: templateRepository } = useRepositories();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void templateRepository
      .listTemplates()
      .then((catalog) => {
        if (active) {
          setTemplates(catalog);
        }
      })
      .catch(() => {
        if (active) {
          setTemplates([]);
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
  }, [templateRepository, attempt]);

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { templates, isLoading, reload };
}
