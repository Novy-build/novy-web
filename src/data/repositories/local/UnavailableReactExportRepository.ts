import { ExportError } from '@domain/errors/ExportError';
import type {
  ReactExportArchive,
  ReactExportRepository,
} from '@domain/repositories/reactExport.repository';

/** Local-only workspaces cannot generate a source archive without the backend. */
export class UnavailableReactExportRepository implements ReactExportRepository {
  readonly isAvailable = false;

  async exportReact(_manifest: unknown): Promise<ReactExportArchive> {
    throw new ExportError(
      'unavailable',
      'Configure VITE_API_BASE_URL and sign in to download a React app.',
    );
  }
}
