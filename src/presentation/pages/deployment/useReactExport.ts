import { useCallback, useState } from 'react';
import { ExportError } from '@domain/errors/ExportError';
import { useRepositories } from '@main/providers/RepositoriesProvider';

interface ReactExportState {
  isDownloading: boolean;
  error: string | null;
  download: () => Promise<void>;
}

export function useReactExport(manifest: unknown): ReactExportState {
  const { reactExport } = useRepositories();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (): Promise<void> => {
    if (isDownloading) return;
    setIsDownloading(true);
    setError(null);
    try {
      const archive = await reactExport.exportReact(manifest);
      downloadArchive(archive.content, archive.filename);
    } catch (cause) {
      setError(exportErrorMessage(cause));
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, manifest, reactExport]);

  return { isDownloading, error, download };
}

function downloadArchive(content: ArrayBuffer, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportErrorMessage(cause: unknown): string {
  if (!(cause instanceof ExportError)) {
    return 'The React app could not be downloaded. Try again.';
  }
  if (cause.message && !cause.message.startsWith('ExportError:')) return cause.message;
  switch (cause.code) {
    case 'validation':
      return 'Fix the project validation errors and try the export again.';
    case 'generation':
      return 'The backend could not generate this React project.';
    case 'timeout':
      return 'React project generation timed out. Try again.';
    case 'rate-limited':
      return 'Too many exports were requested. Wait a moment and try again.';
    case 'session-expired':
      return 'Your session expired. Sign in again before exporting.';
    case 'unavailable':
      return 'React export requires a configured backend connection.';
    case 'network':
      return 'The backend could not be reached. Check your connection and try again.';
    case 'unexpected':
      return 'The React app could not be downloaded. Try again.';
  }
}
