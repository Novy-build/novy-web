import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ProjectSummary } from '@domain/entities/project';
import type { Template } from '@domain/entities/template';
import { Button } from '@presentation/components/ui/Button';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { TextInput } from '@presentation/components/ui/TextInput';
import { useSession } from '@main/providers/SessionProvider';
import { ProjectCard } from './ProjectCard';
import { ConfirmDeleteDialog } from './dialogs/ConfirmDeleteDialog';
import { RenameDialog } from './dialogs/RenameDialog';
import { TemplateGalleryModal } from './TemplateGalleryModal';
import { useProjects } from './useProjects';
import { useTemplates } from './useTemplates';

/**
 * Projects dashboard: member header, search over project cards, the New
 * Project template gallery, and CRUD via the dashboard hook. All data flows
 * through the injected repositories — never directly from this page.
 */
export function ProjectsPage() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const {
    projects,
    isLoading,
    hasFailed,
    reload,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
  } = useProjects();
  const { templates } = useTemplates();

  const [search, setSearch] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return projects;
    }
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, search]);

  const handleCreate = useCallback(
    async (name: string, template: Template): Promise<void> => {
      const created = await createProject(name, template);
      setIsGalleryOpen(false);
      navigate(`/project/${created.id}/editor`);
    },
    [createProject, navigate],
  );

  const handleRename = useCallback(
    async (newName: string): Promise<void> => {
      if (!renameTarget) {
        return;
      }
      await renameProject(renameTarget.id, newName);
      setRenameTarget(null);
    },
    [renameProject, renameTarget],
  );

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteProject, deleteTarget]);

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-tile bg-brand-600 text-sm font-bold text-white"
          >
            N
          </span>
          <span className="text-base font-bold tracking-tight text-ink">Novy</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-muted">{user?.displayName ?? ''}</p>
          <Button onClick={() => void signOut()} variant="ghost">
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Projects</h1>
            <p className="mt-1 text-sm text-ink-muted">Everything you have built so far.</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-64">
              <TextInput
                label="Search projects"
                name="search-projects"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name"
                type="search"
                value={search}
              />
            </div>
            <Button onClick={() => setIsGalleryOpen(true)} className="h-10">
              New project
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8">
            <LoadingScreen label="Loading projects…" />
          </div>
        ) : hasFailed ? (
          <FailurePanel onRetry={reload} />
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setIsGalleryOpen(true)} />
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <li key={project.id}>
                <ProjectCard
                  onDuplicate={() => void duplicateProject(project.id)}
                  onDelete={() => setDeleteTarget(project)}
                  onRename={() => setRenameTarget(project)}
                  project={project}
                />
              </li>
            ))}
          </ul>
        )}

        {visibleProjects.length === 0 && search.trim().length > 0 && !isLoading && !hasFailed ? (
          <p className="mt-8 text-center text-sm text-ink-muted">
            No projects match &ldquo;{search}&rdquo;.
          </p>
        ) : null}
      </main>

      {isGalleryOpen ? (
        <TemplateGalleryModal
          onCancel={() => setIsGalleryOpen(false)}
          onCreate={handleCreate}
          templates={templates}
        />
      ) : null}
      {renameTarget ? (
        <RenameDialog
          onCancel={() => setRenameTarget(null)}
          onConfirm={handleRename}
          project={renameTarget}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmDeleteDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          project={deleteTarget}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="mt-12 rounded-panel border border-dashed border-hairline bg-surface p-12 text-center">
      <h2 className="text-lg font-semibold text-ink">Start building</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Pick a starter template and put your first screen on the canvas — no code required.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        Create your first project
      </Button>
    </section>
  );
}

function FailurePanel({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mt-12 rounded-panel border border-hairline bg-surface p-12 text-center">
      <h2 className="text-lg font-semibold text-ink">We could not load your projects</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Something went wrong while fetching your workspace. Try again in a moment.
      </p>
      <Button className="mt-5" onClick={onRetry}>
        Reload
      </Button>
    </section>
  );
}
