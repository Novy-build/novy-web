/** Generated-application RAG entities shared by the domain and data layers. */

export type RagCapability = 'embedding' | 'chat' | 'reranking' | 'vector' | 'memory';

export type RagProfileLocation = 'local' | 'remote' | 'backend';

export interface RagProfile {
  id: string;
  name: string;
  capability: RagCapability;
  provider: string;
  models: readonly string[];
  defaultModel: string | null;
  location: RagProfileLocation;
  costWarning: boolean;
  usageNote: string;
  available: boolean;
  embeddingDimensions: number | null;
}

export interface RagFileSource {
  id: string;
  projectId: string;
  filename: string;
  mediaType: string;
  contentHash: string;
  createdAt: string;
}
