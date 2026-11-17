import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { RagSourcesPanel } from './RagSourcesPanel';

describe('RagSourcesPanel', () => {
  it('lists uploaded document sources and removes them', async () => {
    const repositories = createStubRepositories();
    const source = {
      id: 'rag_file_1',
      projectId: 'project_1',
      filename: 'notes.txt',
      mediaType: 'text/plain',
      contentHash: 'abc',
      createdAt: '2026-11-16T00:00:00Z',
    };
    const listFileSources = vi.fn().mockResolvedValue([source]);
    const deleteFileSource = vi.fn().mockResolvedValue(undefined);
    const uploadFileSource = vi.fn().mockResolvedValue(source);
    Object.assign(repositories.rag, { listFileSources, deleteFileSource, uploadFileSource });

    render(
      <RepositoriesProvider repositories={repositories}>
        <RagSourcesPanel projectId="project_1" sources={[source]} />
      </RepositoriesProvider>,
    );

    expect(screen.getByText('notes.txt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteFileSource).toHaveBeenCalledWith('project_1', 'rag_file_1'));
  });

  it('reports an upload failure without losing the existing list', async () => {
    const repositories = createStubRepositories();
    Object.assign(repositories.rag, {
      uploadFileSource: vi.fn().mockRejectedValue(new Error('The file type is not supported.')),
    });

    render(
      <RepositoriesProvider repositories={repositories}>
        <RagSourcesPanel projectId="project_1" sources={[]} />
      </RepositoriesProvider>,
    );

    const input = screen.getByLabelText('Document file');
    const file = new File(['alpha'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('The file type is not supported.');
  });
});
