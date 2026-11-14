import type { AppDataStoreDTO } from './appData.dto';
import type { ProjectDTO, ScreenDTO } from './project.dto';

export interface ProjectSummaryDTO {
  id: string;
  name: string;
  projectType?: 'app' | 'website';
  createdAt: string;
  updatedAt: string;
  screenCount: number;
  previewScreen: ScreenDTO | null;
}

export interface ProjectListResponseDTO {
  projects: ProjectSummaryDTO[];
}

export interface ProjectResponseDTO {
  schemaVersion: number;
  id: string;
  name: string;
  projectType?: 'app' | 'website';
  createdAt: string;
  updatedAt: string;
  screens: ScreenDTO[];
  revision: number;
}

export interface ImportProjectRequestDTO {
  project: ProjectDTO;
  appData?: AppDataStoreDTO | null;
}
