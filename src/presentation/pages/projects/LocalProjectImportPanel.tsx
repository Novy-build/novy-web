import { Button } from '@presentation/components/ui/Button';
import { useProjectImport } from './useProjectImport';

interface LocalProjectImportPanelProps {
  /** Re-fetches the remote project list after a successful import. */
  onImported: () => void;
}

/**
 * Explicit migration path for projects that only exist in this browser.
 * The panel disappears when there is nothing to import and no feedback to
 * show, so remote-only accounts never see browser-storage noise.
 */
export function LocalProjectImportPanel({ onImported }: LocalProjectImportPanelProps) {
  const {
    importableProjects,
    isLoading,
    importingProjectId,
    notice,
    error,
    importProject,
    refresh,
  } = useProjectImport(onImported);

  if (!isLoading && importableProjects.length === 0 && !notice && !error) {
    return null;
  }

  return (
    <section
      aria-labelledby="local-projects-heading"
      className="mt-8 rounded-panel border border-hairline bg-surface p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="local-projects-heading" className="text-base font-semibold text-ink">
            Projects saved in this browser
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Import a browser-only project into your account. The local copy stays in this browser
            until you remove it yourself.
          </p>
        </div>
        <Button disabled={isLoading} onClick={refresh} variant="ghost">
          Refresh
        </Button>
      </div>

      {notice ? (
        <p className="mt-3 text-sm text-ink" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-3 text-sm text-ink-muted" role="status">
          Checking for local projects…
        </p>
      ) : importableProjects.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted" role="status">
          No local projects left to import.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {importableProjects.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-ink">{project.name}</p>
                <p className="text-xs text-ink-muted">
                  {project.screenCount} {project.screenCount === 1 ? 'screen' : 'screens'}
                </p>
              </div>
              <Button
                aria-label={`Import ${project.name}`}
                disabled={importingProjectId !== null}
                isLoading={importingProjectId === project.id}
                onClick={() => void importProject(project.id)}
                variant="ghost"
              >
                Import
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
