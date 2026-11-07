import type { ProjectDatabaseDTO, DataCollectionDTO } from './appData.dto';
import type { ProjectDTO } from './project.dto';

export type RuntimeCapabilityId =
  | 'authentication'
  | 'database'
  | 'email'
  | 'rag'
  | 'computer-vision'
  | 'camera'
  | 'deployment';

export interface RuntimeRequirementDTO {
  capability: RuntimeCapabilityId;
  configurationOwner: 'backend' | 'browser';
  requiredBinding: string;
  requiredBy: string[];
}

/**
 * Provider-agnostic handoff consumed by the future backend generator.
 * It intentionally contains schema/configuration only: no app records,
 * provider credentials, raw camera captures, or biometric templates.
 */
export interface GeneratedAppManifestDTO {
  manifestVersion: 1;
  generatedAt: string;
  project: ProjectDTO;
  appData: {
    database: ProjectDatabaseDTO | null;
    collections: DataCollectionDTO[];
    recordsIncluded: false;
  };
  runtime: {
    requirements: RuntimeRequirementDTO[];
    routes: Array<{ screenId: string; path: string }>;
    responsiveBreakpoints: { tabletMinWidth: 768; desktopMinWidth: 1024 };
  };
  security: {
    secretsIncluded: false;
    rawMediaIncluded: false;
    biometricTemplatesIncluded: false;
  };
}
