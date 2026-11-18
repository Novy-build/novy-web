import type { ProjectDatabaseDTO, DataCollectionDTO } from './appData.dto';
import type { PaddingDTO, ProjectDTO } from './project.dto';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import type { ComponentAppearance } from '@domain/entities/componentNode';

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
  manifestVersion: 2;
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
    routes: Array<{
      screenId: string;
      path: string;
      parameters?: GeneratedRouteParameterDTO[];
    }>;
    responsiveBreakpoints: { tabletMinWidth: 768; desktopMinWidth: 1024 };
  };
  security: {
    secretsIncluded: false;
    rawMediaIncluded: false;
    biometricTemplatesIncluded: false;
  };
}

export interface GeneratedRouteParameterDTO {
  name: string;
  source: 'record-id';
  collectionId: string;
  identifierKey: string;
}

export interface GeneratedRecordIdentityDTO {
  collectionId: string;
  key: string;
  source: 'record-id';
  generation: 'backend';
}

export interface GeneratedItemFrameDTO {
  id: string;
  kind: 'container';
  role: 'repeated-item';
  constraints: {
    crossAxis: 'fill-listview';
    mainAxis: 'hug-content';
  };
  padding: PaddingDTO;
  itemSpacing: number;
  itemBorderRadius: number;
  showDividers: boolean;
  recordIdentity?: GeneratedRecordIdentityDTO;
  children: readonly GeneratedLayoutNodeDTO[];
}

export interface GeneratedLayoutNodeDTO {
  id: string;
  type: import('./project.dto').ComponentNodeDTO['type'];
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  styleId?: string;
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
  layoutVersion: 2;
  designSystem?: AppDesignSystem;
  screens: readonly {
    screenId: string;
    path: string;
    routeParameters?: readonly GeneratedRouteParameterDTO[];
    appearance?: ComponentAppearance;
    nodes: readonly GeneratedLayoutNodeDTO[];
  }[];
}
