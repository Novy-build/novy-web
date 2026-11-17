import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RagProfile } from '@domain/entities/rag';
import { makeListView, makeText } from '@test/editorFixtures';
import { RagNodeConfig } from './RagNodeConfig';

const EMBEDDING_PROFILE: RagProfile = {
  id: 'ollama-embedding',
  name: 'Ollama Embeddings',
  capability: 'embedding',
  provider: 'ollama',
  models: ['embedding-test'],
  defaultModel: 'embedding-test',
  location: 'local',
  costWarning: false,
  usageNote: 'Local.',
  available: true,
  embeddingDimensions: 256,
};

const CHAT_PROFILE: RagProfile = {
  id: 'openrouter-chat',
  name: 'OpenRouter Chat',
  capability: 'chat',
  provider: 'openrouter',
  models: ['openai/gpt-4o'],
  defaultModel: 'openai/gpt-4o',
  location: 'remote',
  costWarning: true,
  usageNote: 'Prompts leave the Novy backend.',
  available: true,
  embeddingDimensions: null,
};

describe('RagNodeConfig', () => {
  it('configures granular text splitting', () => {
    const onChange = vi.fn();
    render(
      <RagNodeConfig
        collections={[]}
        onChange={onChange}
        payload={{ type: 'text-split', strategy: 'recursive-character', chunkSize: 700, chunkOverlap: 100, separators: [] }}
        screenNodes={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Chunk size'), { target: { value: '800' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'text-split', chunkSize: 800 }));
  });

  it('selects answer and citation targets for Chat Output', () => {
    const onChange = vi.fn();
    const citationListView = makeListView('citations');
    render(
      <RagNodeConfig
        collections={[]}
        onChange={onChange}
        payload={{ type: 'chat-output', targetNodeId: '', citationsNodeId: '' }}
        screenNodes={[makeText('answer'), citationListView]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Answer Text component'), { target: { value: 'answer' } });
    fireEvent.change(screen.getByLabelText('Citation ListView'), { target: { value: 'citations' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ targetNodeId: 'answer' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ citationsNodeId: 'citations' }));
  });

  it('configures one Vector Store node for upsert, delete, or retrieval-tool operation', () => {
    const onChange = vi.fn();
    render(
      <RagNodeConfig
        collections={[]}
        onChange={onChange}
        payload={{ type: 'vector-store', operation: 'upsert', connectionProfileId: '', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 }}
        screenNodes={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'retrieve-tool' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operation: 'retrieve-tool' }));
  });

  it('selects a backend connection profile instead of a free-text identifier', () => {
    const onChange = vi.fn();
    render(
      <RagNodeConfig
        collections={[]}
        onChange={onChange}
        payload={{ type: 'embedding-generate', connectionProfileId: '', model: '', batchSize: 32 }}
        profiles={[EMBEDDING_PROFILE, CHAT_PROFILE]}
        screenNodes={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Embedding profile'), {
      target: { value: 'ollama-embedding' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ connectionProfileId: 'ollama-embedding' }),
    );
  });

  it('offers only the models allowed by the selected profile', () => {
    const onChange = vi.fn();
    render(
      <RagNodeConfig
        collections={[]}
        onChange={onChange}
        payload={{ type: 'chat-model', connectionProfileId: 'openrouter-chat', model: '', temperature: 0.2, maxTokens: 800 }}
        profiles={[CHAT_PROFILE]}
        screenNodes={[]}
      />,
    );

    const model = screen.getByLabelText('Model') as HTMLSelectElement;
    expect([...model.options].map((option) => option.value)).toEqual(['', 'openai/gpt-4o']);
  });

  it('warns when a saved profile is not offered by the backend', () => {
    render(
      <RagNodeConfig
        collections={[]}
        onChange={vi.fn()}
        payload={{ type: 'embedding-generate', connectionProfileId: 'legacy-profile', model: '', batchSize: 32 }}
        profiles={[EMBEDDING_PROFILE]}
        screenNodes={[]}
      />,
    );

    expect(screen.getByText(/legacy-profile/)).toBeInTheDocument();
  });

  it('lists uploaded document sources for file references', () => {
    const onChange = vi.fn();
    render(
      <RagNodeConfig
        collections={[]}
        fileSources={[
          {
            id: 'rag_file_1',
            projectId: 'project_1',
            filename: 'notes.txt',
            mediaType: 'text/plain',
            contentHash: 'abc',
            createdAt: '2026-11-16T00:00:00Z',
          },
        ]}
        onChange={onChange}
        payload={{ type: 'document-load', source: 'file-reference', sourceReference: '', documentId: '', title: '', text: '', metadata: {} }}
        screenNodes={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Uploaded file'), { target: { value: 'rag_file_1' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sourceReference: 'rag_file_1' }),
    );
  });
});
