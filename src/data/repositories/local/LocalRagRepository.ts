import type { RagFileSource, RagProfile } from '@domain/entities/rag';
import { ProjectError } from '@domain/errors/ProjectError';
import type { RagRepository } from '@domain/repositories/rag.repository';

/**
 * Browser-only RAG configuration.
 *
 * The local composition has no backend, so it exposes the same backend-owned
 * profile IDs as unavailable placeholders. This keeps old documents readable
 * and lets the editor show that a profile must be confirmed by the backend
 * instead of pretending that local inference is available.
 */
export class LocalRagRepository implements RagRepository {
  private readonly latencyMs: number;

  constructor(latencyMs = 0) {
    this.latencyMs = latencyMs;
  }

  async listProfiles(capability?: string): Promise<RagProfile[]> {
    await this.delay();
    const profiles = [
      profile('ollama-embedding', 'Ollama Embeddings', 'embedding', 'ollama', 'local', false),
      profile('ollama-chat', 'Ollama Chat', 'chat', 'ollama', 'local', false),
      profile('ollama-reranker', 'Ollama Reranker', 'reranking', 'ollama', 'local', false),
      profile('openrouter-chat', 'OpenRouter Chat', 'chat', 'openrouter', 'remote', true),
      profile('postgres-vector', 'Novy Vector Store', 'vector', 'postgresql', 'backend', false),
      profile('postgres-memory', 'Novy Conversation Memory', 'memory', 'postgresql', 'backend', false),
    ];
    return capability ? profiles.filter((item) => item.capability === capability) : profiles;
  }

  async listFileSources(_projectId: string): Promise<RagFileSource[]> {
    await this.delay();
    return [];
  }

  async uploadFileSource(_projectId: string, _file: File): Promise<RagFileSource> {
    await this.delay();
    throw new ProjectError(
      'unavailable',
      'Connect Novy to the backend to upload RAG document sources.',
    );
  }

  async deleteFileSource(_projectId: string, _sourceId: string): Promise<void> {
    await this.delay();
    throw new ProjectError(
      'unavailable',
      'Connect Novy to the backend to manage RAG document sources.',
    );
  }

  private async delay(): Promise<void> {
    if (this.latencyMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}

function profile(
  id: string,
  name: string,
  capability: RagProfile['capability'],
  provider: string,
  location: RagProfile['location'],
  costWarning: boolean,
): RagProfile {
  return {
    id,
    name,
    capability,
    provider,
    models: [],
    defaultModel: null,
    location,
    costWarning,
    usageNote: 'Confirmed by the Novy backend.',
    available: false,
    embeddingDimensions: null,
  };
}
