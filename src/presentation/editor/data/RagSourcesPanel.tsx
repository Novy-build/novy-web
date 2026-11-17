import { useRef, useState, type ChangeEvent } from 'react';
import type { RagFileSource } from '@domain/entities/rag';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import { Button } from '@presentation/components/ui/Button';

/**
 * Manages project-scoped RAG document sources.
 *
 * Sources live on the backend: the browser uploads a file once and the Logic
 * workspace later references the returned source identifier. Uploaded binaries
 * are not stored in the browser.
 */
export function RagSourcesPanel({
  projectId,
  sources,
  onChanged,
}: {
  projectId: string;
  sources: readonly RagFileSource[];
  onChanged?: (sources: RagFileSource[]) => void;
}) {
  const { rag } = useRepositories();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const created = await rag.uploadFileSource(projectId, file);
      onChanged?.([...sources, created]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document source could not be uploaded.');
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(sourceId: string): Promise<void> {
    setDeletingId(sourceId);
    setError(null);
    try {
      await rag.deleteFileSource(projectId, sourceId);
      onChanged?.(sources.filter((source) => source.id !== sourceId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document source could not be removed.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-label="Document sources" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
      <div>
        <h2 className="text-sm font-semibold text-ink">Document sources</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Upload a text, Markdown, HTML, or PDF file so a Document Loader node can index it. Files
          are extracted and stored by the Novy backend.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          accept=".txt,.md,.markdown,.html,.htm,.pdf,text/plain,text/markdown,text/html,application/pdf"
          aria-label="Document file"
          className="hidden"
          onChange={(event) => void upload(event)}
          ref={inputRef}
          type="file"
        />
        <Button
          isLoading={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Upload document
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 grid gap-2">
        {sources.length === 0 ? (
          <li className="text-sm text-ink-muted" role="status">
            No document sources yet.
          </li>
        ) : null}
        {sources.map((source) => (
          <li
            className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2"
            key={source.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{source.filename}</p>
              <p className="text-xs text-ink-muted">{source.mediaType}</p>
            </div>
            <button
              className="text-sm font-medium text-red-600 disabled:opacity-50"
              disabled={deletingId === source.id}
              onClick={() => void remove(source.id)}
              type="button"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
