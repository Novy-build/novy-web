import { useParams } from 'react-router';

/**
 * Deployment screen placeholder (Phase 0).
 * Phase 7 adds the publish stepper, fake live URLs, and deployment history.
 */
export function DeploymentPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <section className="rounded-panel border border-hairline bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-ink">Deployment</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The publish flow arrives in Phase 7. Project{' '}
          <strong className="font-semibold text-ink">{projectId ?? '?'}</strong> is
          selected.
        </p>
      </section>
    </main>
  );
}
