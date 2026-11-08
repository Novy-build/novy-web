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
  layout: GeneratedLayoutDTO;
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

export interface GeneratedItemFrameDTO {
  id: string;
  kind: 'container';
  role: 'repeated-item';
  constraints: {
    crossAxis: 'fill-listview';
    mainAxis: 'hug-content';
  };
  padding: number;
  itemSpacing: number;
  itemBorderRadius: number;
  showDividers: boolean;
  children: readonly GeneratedLayoutNodeDTO[];
}

export interface GeneratedLayoutNodeDTO {
  id: string;
  type: import('./project.dto').ComponentNodeDTO['type'];
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  appearance?: import('./project.dto').ComponentNodeDTOBase['appearance'];
  responsive?: import('./project.dto').ComponentNodeDTOBase['responsive'];
  bindings?: import('./project.dto').ComponentNodeDTOBase['bindings'];
  props: Record<string, unknown>;
  children?: readonly GeneratedLayoutNodeDTO[];
  itemFrame?: GeneratedItemFrameDTO;
}

export interface GeneratedLayoutDTO {
  layoutVersion: 1;
  screens: readonly {
    screenId: string;
    path: string;
    nodes: readonly GeneratedLayoutNodeDTO[];
  }[];
}
