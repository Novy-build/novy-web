import { useMemo } from 'react';
import { validateProject, type ValidationReport } from '@domain/validation/projectValidation';
import type { ProjectDocument } from '@domain/entities/screen';
import type { DataCollection } from '@domain/entities/appData';

export type { ValidationReport };

export function useProjectValidation(
  document: ProjectDocument,
  collections: readonly DataCollection[],
): ValidationReport {
  return useMemo(() => validateProject(document, collections), [document, collections]);
}
