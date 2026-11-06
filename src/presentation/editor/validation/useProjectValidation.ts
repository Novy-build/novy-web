import { useEffect, useMemo, useState } from 'react';
import { validateProject, type ValidationReport } from '@domain/validation/projectValidation';
import type { ProjectDocument } from '@domain/entities/screen';
import type { DataCollection } from '@domain/entities/appData';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export type { ValidationReport };

export function useProjectValidation(
  projectId: string,
  document: ProjectDocument,
): ValidationReport {
  const { appData } = useRepositories();
  const [collections, setCollections] = useState<readonly DataCollection[]>([]);

  useEffect(() => {
    let active = true;
    void appData.listCollections(projectId).then((loaded) => {
      if (active) setCollections(loaded);
    });
    return () => { active = false; };
  }, [appData, projectId]);

  return useMemo(() => validateProject(document, collections), [document, collections]);
}
