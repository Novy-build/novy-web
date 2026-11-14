import type { ProjectDocument } from './screen';

export type ProjectType = 'app' | 'website';

export interface Project {
  id: string;
  name: string;
  projectType: ProjectType;
  createdAt: Date;
  updatedAt: Date;
  document: ProjectDocument;
}

/** Light-weight shape returned by project listings. */
export interface ProjectSummary {
  id: string;
  name: string;
  projectType: ProjectType;
  createdAt: Date;
  updatedAt: Date;
  screenCount: number;
  /** First screen of the document, for live thumbnails on the dashboard. */
  previewScreen: ProjectDocument['screens'][number] | null;
}
