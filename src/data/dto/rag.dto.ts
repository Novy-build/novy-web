import type { RagCapability, RagProfileLocation } from '@domain/entities/rag';

export interface RagProfileDTO {
  id: string;
  name: string;
  capability: RagCapability;
  provider: string;
  models: string[];
  defaultModel: string | null;
  location: RagProfileLocation;
  costWarning: boolean;
  usageNote: string;
  available: boolean;
  embeddingDimensions: number | null;
}

export interface RagProfileListDTO {
  profiles: RagProfileDTO[];
}

export interface RagFileSourceDTO {
  id: string;
  projectId: string;
  filename: string;
  mediaType: string;
  contentHash: string;
  createdAt: string;
}

export interface RagFileSourceListDTO {
  files: RagFileSourceDTO[];
}
