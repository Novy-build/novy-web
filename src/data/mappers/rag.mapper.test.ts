import { describe, expect, it } from 'vitest';
import {
  mapRagFileSourceFromDto,
  mapRagFileSourceListFromDto,
  mapRagProfileFromDto,
  mapRagProfileListFromDto,
} from './rag.mapper';

const PROFILE = {
  id: 'ollama-chat',
  name: 'Ollama Chat',
  capability: 'chat',
  provider: 'ollama',
  models: ['qwen3:4b-instruct'],
  defaultModel: 'qwen3:4b-instruct',
  location: 'local',
  costWarning: false,
  usageNote: 'Processed by the loopback Ollama service.',
  available: true,
  embeddingDimensions: null,
};

describe('rag mapper', () => {
  it('maps a connection profile with locality and cost information', () => {
    expect(mapRagProfileFromDto(PROFILE)).toEqual({
      id: 'ollama-chat',
      name: 'Ollama Chat',
      capability: 'chat',
      provider: 'ollama',
      models: ['qwen3:4b-instruct'],
      defaultModel: 'qwen3:4b-instruct',
      location: 'local',
      costWarning: false,
      usageNote: 'Processed by the loopback Ollama service.',
      available: true,
      embeddingDimensions: null,
    });
  });

  it('rejects a profile with an unknown capability', () => {
    expect(mapRagProfileFromDto({ ...PROFILE, capability: 'telepathy' })).toBeNull();
  });

  it('falls back to a safe location for an unknown value', () => {
    expect(mapRagProfileFromDto({ ...PROFILE, location: 'elsewhere' })?.location).toBe('backend');
  });

  it('maps a profile list and drops invalid entries', () => {
    const profiles = mapRagProfileListFromDto({
      profiles: [PROFILE, { id: '', name: 'Broken' }, 'nope'],
    });

    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.id).toBe('ollama-chat');
  });

  it('maps a file source without exposing extracted content', () => {
    const source = mapRagFileSourceFromDto({
      id: 'rag_file_1',
      projectId: 'project_1',
      filename: 'notes.txt',
      mediaType: 'text/plain',
      contentHash: 'abc',
      createdAt: '2026-11-16T00:00:00Z',
    });

    expect(source).toEqual({
      id: 'rag_file_1',
      projectId: 'project_1',
      filename: 'notes.txt',
      mediaType: 'text/plain',
      contentHash: 'abc',
      createdAt: '2026-11-16T00:00:00Z',
    });
    expect(source && 'extractedText' in source).toBe(false);
  });

  it('maps a file source list and drops invalid entries', () => {
    const files = mapRagFileSourceListFromDto({
      files: [
        {
          id: 'rag_file_1',
          projectId: 'project_1',
          filename: 'notes.txt',
          mediaType: 'text/plain',
          contentHash: 'abc',
          createdAt: '2026-11-16T00:00:00Z',
        },
        { id: 'rag_file_2' },
      ],
    });

    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('notes.txt');
  });
});
