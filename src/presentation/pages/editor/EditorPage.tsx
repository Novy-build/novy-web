import { useNavigate, useParams } from 'react-router';
import { useEditorProject } from '@presentation/editor/hooks/useEditorProject';
import { EditorWorkspace } from '@presentation/editor/workspace/EditorWorkspace';

function StatusPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <section className="rounded-panel border border-hairline bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <div className="mt-2 max-w-sm text-sm text-ink-muted">{children}</div>
      </section>
    </main>
  );
}

/**
 * Editor route: resolves the project, shows loading/not-found/error states,
 * then mounts the design workspace. Back returns to Projects; Deploy opens
 * the deployment flow.
 */
export function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? '';
  const navigate = useNavigate();
  const { project, status, renameProject } = useEditorProject(projectId);

  if (status === 'loading') {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center">
        <p className="text-sm text-ink-muted" role="status">
          Loading editor…
        </p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <StatusPanel title="Editor could not load">
        <p>
          Something went wrong while opening this project. Head back to Projects and try again.
        </p>
      </StatusPanel>
    );
  }

  if (project === null) {
    return (
      <StatusPanel title="Project not found">
        <p>
          We could not find a project with id{' '}
          <strong className="font-semibold text-ink">{projectId || '?'}</strong>. It may have been
          deleted.
        </p>
      </StatusPanel>
    );
  }

  return (
    <EditorWorkspace
      onBack={() => navigate('/projects')}
      onDeploy={() => navigate(`/project/${projectId}/deploy`)}
      onRenameProject={renameProject}
      project={project}
    />
  );
}
