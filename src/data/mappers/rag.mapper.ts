import type { RagFileSource, RagProfile, RagProfileLocation } from '@domain/entities/rag';
import type { RagFileSourceDTO, RagProfileDTO } from '../dto/rag.dto';

const CAPABILITIES = new Set(['embedding', 'chat', 'reranking', 'vector', 'memory']);
const LOCATIONS = new Set(['local', 'remote', 'backend']);

export function mapRagProfileFromDto(dto: unknown): RagProfile | null {
  if (!isRecord(dto)) return null;
  const id = readString(dto.id);
  const name = readString(dto.name);
  const capability = readString(dto.capability);
  const provider = readString(dto.provider);
  if (!id || !name || !provider) return null;
  if (!CAPABILITIES.has(capability)) return null;
  const location = readString(dto.location);
  const models = Array.isArray(dto.models)
    ? dto.models.filter((model): model is string => typeof model === 'string')
    : [];
  const defaultModel = typeof dto.defaultModel === 'string' ? dto.defaultModel : null;
  const embeddingDimensions =
    typeof dto.embeddingDimensions === 'number' && Number.isFinite(dto.embeddingDimensions)
      ? dto.embeddingDimensions
      : null;
  return {
    id,
    name,
    capability: capability as RagProfile['capability'],
    provider,
    models,
    defaultModel,
    location: (LOCATIONS.has(location) ? location : 'backend') as RagProfileLocation,
    costWarning: dto.costWarning === true,
    usageNote: readString(dto.usageNote),
    available: dto.available === true,
    embeddingDimensions,
  };
}

export function mapRagFileSourceFromDto(dto: unknown): RagFileSource | null {
  if (!isRecord(dto)) return null;
  const id = readString(dto.id);
  const projectId = readString(dto.projectId);
  const filename = readString(dto.filename);
  if (!id || !projectId || !filename) return null;
  return {
    id,
    projectId,
    filename,
    mediaType: readString(dto.mediaType),
    contentHash: readString(dto.contentHash),
    createdAt: readString(dto.createdAt),
  };
}

export function mapRagProfileListFromDto(dto: unknown): RagProfile[] {
  if (!isRecord(dto) || !Array.isArray(dto.profiles)) return [];
  return dto.profiles
    .map((profile) => mapRagProfileFromDto(profile))
    .filter((profile): profile is RagProfile => profile !== null);
}

export function mapRagFileSourceListFromDto(dto: unknown): RagFileSource[] {
  if (!isRecord(dto) || !Array.isArray(dto.files)) return [];
  return dto.files
    .map((file) => mapRagFileSourceFromDto(file))
    .filter((file): file is RagFileSource => file !== null);
}

export type { RagFileSourceDTO, RagProfileDTO };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
