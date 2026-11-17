import type { RagFileSource, RagProfile } from '../entities/rag';

export interface RagRepository {
  /** Backend-owned connection profiles. Never contains credentials. */
  listProfiles(capability?: string): Promise<RagProfile[]>;
  listFileSources(projectId: string): Promise<RagFileSource[]>;
  uploadFileSource(projectId: string, file: File): Promise<RagFileSource>;
  deleteFileSource(projectId: string, sourceId: string): Promise<void>;
}
