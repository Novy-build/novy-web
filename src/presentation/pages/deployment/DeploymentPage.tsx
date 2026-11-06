import { useNavigate, useParams } from 'react-router';
import type { DeploymentEnvironment } from '@domain/entities/deployment';
import { Button } from '@presentation/components/ui/Button';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import { useState, useEffect } from 'react';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { DeploymentHistory } from './DeploymentHistory';
import { PublishStepper } from './PublishStepper';
import { PublishSuccessModal } from './PublishSuccessModal';
import { useDeployment } from './useDeployment';

/** Per-project publish screen with mock environments, pipeline, and history. */
export function DeploymentPage() {
  const projectId = useParams<{ projectId: string }>().projectId ?? '';
  const navigate = useNavigate();
  const { appData } = useRepositories();
  const [collections, setCollections] = useState<import('@domain/entities/appData').DataCollection[]>([]);
  useEffect(() => {
    void appData.listCollections(projectId).then(setCollections).catch(() => setCollections([]));
  }, [appData, projectId]);
  const deployment = useDeployment(projectId, { collections });

  if (deployment.status === 'loading') {
    return <LoadingScreen label="Loading deployment…" />;
  }
  if (deployment.status === 'error') {
    return (
      <RouteStatus title="Deployment could not load">
        <p>Something went wrong while loading the project and its publish history.</p>
        <Button className="mt-4" onClick={deployment.reload}>Try again</Button>
      </RouteStatus>
    );
  }
  if (!deployment.project) {
    return (
      <RouteStatus title="Project not found">
        <p>This project may have been deleted or the link is no longer valid.</p>
        <Button className="mt-4" onClick={() => navigate('/projects')}>Back to projects</Button>
      </RouteStatus>
    );
  }

  const project = deployment.project;
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="border-b border-hairline bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Back to editor"
              className="rounded-tile p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
              onClick={() => navigate(`/project/${project.id}/editor`)}
              type="button"
            >
              ←
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{project.name}</p>
              <p className="text-xs text-ink-muted">Deployment</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/project/${project.id}/editor`)} variant="ghost">
            Return to editor
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Publish your app</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Choose an environment, run the mock pipeline, and share the generated URL.
            </p>
          </div>
          <Button
            className="min-w-36"
            disabled={deployment.isPublishing}
            isLoading={deployment.isPublishing}
            onClick={() => void deployment.publish()}
          >
            {deployment.isPublishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <EnvironmentSelector
              disabled={deployment.isPublishing}
              onChange={deployment.setEnvironment}
              value={deployment.environment}
            />
            {deployment.isPublishing && deployment.activeStageIndex !== null ? (
              <PublishStepper activeStageIndex={deployment.activeStageIndex} />
            ) : null}
            {deployment.publishError ? (
              <p className="rounded-tile border border-signal-invalid/30 bg-signal-invalid/5 p-3 text-sm text-signal-invalid" role="alert">
                {deployment.publishError}
              </p>
            ) : null}
            {deployment.validationError ? (
              <p className="rounded-tile border border-signal-invalid/30 bg-signal-invalid/5 p-3 text-sm text-signal-invalid" role="alert">
                {deployment.validationError}
              </p>
            ) : null}
            <DeploymentHistory
              deployments={deployment.deployments}
              isPublishing={deployment.isPublishing}
              onRedeploy={() => void deployment.publish()}
            />
          </div>
          <CustomDomainStub />
        </div>
      </main>

      {deployment.successfulDeployment ? (
        <PublishSuccessModal
          deployment={deployment.successfulDeployment}
          onClose={deployment.closeSuccess}
        />
      ) : null}
    </div>
  );
}

function EnvironmentSelector({
  value,
  disabled,
  onChange,
}: {
  value: DeploymentEnvironment;
  disabled: boolean;
  onChange: (environment: DeploymentEnvironment) => void;
}) {
  return (
    <section className="rounded-panel border border-hairline bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">Environment</h2>
      <p className="mt-1 text-sm text-ink-muted">Preview is isolated; Production uses your public Novy URL.</p>
      <div aria-label="Deployment environment" className="mt-4 grid grid-cols-2 gap-3" role="group">
        {(['preview', 'production'] as const).map((environment) => (
          <button
            aria-label={`${environment === 'preview' ? 'Preview' : 'Production'} environment`}
            aria-pressed={value === environment}
            className={`rounded-tile border p-4 text-left transition-colors ${
              value === environment
                ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                : 'border-hairline hover:bg-canvas'
            }`}
            disabled={disabled}
            key={environment}
            onClick={() => onChange(environment)}
            type="button"
          >
            <span className="block text-sm font-semibold capitalize text-ink">{environment}</span>
            <span className="mt-1 block text-xs text-ink-muted">
              {environment === 'preview' ? 'Safe test release' : 'Public live release'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CustomDomainStub() {
  return (
    <aside className="h-fit rounded-panel border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Custom domain</h2>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">Coming soon</span>
      </div>
      <p className="mt-2 text-sm text-ink-muted">Connect a domain you already own in a future release.</p>
      <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="custom-domain">Domain</label>
      <input
        className="mt-1 h-10 w-full rounded-tile border border-hairline bg-canvas px-3 text-sm text-ink-muted"
        disabled
        id="custom-domain"
        placeholder="www.example.com"
      />
      <Button className="mt-3" disabled isBlock>Connect domain</Button>
    </aside>
  );
}

function RouteStatus({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-canvas p-6">
      <section className="max-w-md rounded-panel border border-hairline bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <div className="mt-2 text-sm text-ink-muted">{children}</div>
      </section>
    </main>
  );
}
