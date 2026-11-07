import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeText } from '@test/editorFixtures';
import { RagNodeConfig } from './RagNodeConfig';

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
    const citationRepeater = {
      id: 'citations', type: 'repeater' as const, x: 0, y: 0, w: 200, h: 120,
      props: { emptyText: 'No citations', showDividers: true, dataSource: { kind: 'static' as const, items: [] } },
    };
    render(
      <RagNodeConfig
        collections={[]}
        onChange={onChange}
        payload={{ type: 'chat-output', targetNodeId: '', citationsNodeId: '' }}
        screenNodes={[makeText('answer'), citationRepeater]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Answer Text component'), { target: { value: 'answer' } });
    fireEvent.change(screen.getByLabelText('Citation Repeater'), { target: { value: 'citations' } });
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
});
