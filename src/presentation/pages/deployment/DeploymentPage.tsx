import { useNavigate, useParams } from 'react-router';
import type { ProjectDatabase } from '@domain/entities/appData';
import type { DeploymentEnvironment, DeploymentProvider } from '@domain/entities/deployment';
import {
  buildGeneratedAppManifest,
  generatedAppManifestFilename,
} from '@data/generation/generatedAppManifest';
import { Button } from '@presentation/components/ui/Button';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import { useState, useEffect } from 'react';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { DeploymentHistory } from './DeploymentHistory';
import { PublishStepper } from './PublishStepper';
import { PublishSuccessModal } from './PublishSuccessModal';
import { RuntimeReadinessPanel } from './RuntimeReadinessPanel';
import { useDeployment } from './useDeployment';
import { useReactExport } from './useReactExport';

/** Per-project publish screen backed by the configured deployment provider. */
export function DeploymentPage() {
  const projectId = useParams<{ projectId: string }>().projectId ?? '';
  const navigate = useNavigate();
  const { appData } = useRepositories();
  const [collections, setCollections] = useState<import('@domain/entities/appData').DataCollection[]>([]);
  const [database, setDatabase] = useState<ProjectDatabase | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      appData.listDatabases(projectId),
      appData.listCollections(projectId),
    ]).then(([databases, loadedCollections]) => {
      if (!active) return;
      setDatabase(databases[0] ?? null);
      setCollections(loadedCollections);
    }).catch(() => {
      if (!active) return;
      setDatabase(null);
      setCollections([]);
    });
    return () => { active = false; };
  }, [appData, projectId]);
  const deployment = useDeployment(projectId, { collections });
  const handoff = deployment.project
    ? buildGeneratedAppManifest(deployment.project, database, collections)
    : null;
  const reactExport = useReactExport(handoff);

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
  if (!deployment.project || !handoff) {
    return (
      <RouteStatus title="Project not found">
        <p>This project may have been deleted or the link is no longer valid.</p>
        <Button className="mt-4" onClick={() => navigate('/projects')}>Back to projects</Button>
      </RouteStatus>
    );
  }

  const project = deployment.project;

  function exportBackendHandoff(): void {
    const blob = new Blob([JSON.stringify(handoff, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = generatedAppManifestFilename(project.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8" id="main-content">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Publish your app</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Choose a provider and environment, then publish a shareable live URL.
            </p>
          </div>
          <Button
            className="min-w-36"
            disabled={deployment.isPublishing || !deployment.provider}
            isLoading={deployment.isPublishing}
            onClick={() => void deployment.publish(handoff)}
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
            <ProviderSelector
              disabled={deployment.isPublishing}
              onChange={deployment.setProvider}
              providers={deployment.providers}
              value={deployment.provider}
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
              onRedeploy={() => void deployment.publish(handoff)}
            />
          </div>
          <div className="space-y-6">
            <RuntimeReadinessPanel
              deploymentProviders={deployment.providers}
              downloadError={reactExport.error}
              isDownloading={reactExport.isDownloading}
              onDownloadReact={() => void reactExport.download()}
              onExport={exportBackendHandoff}
              requirements={handoff.runtime.requirements}
            />
            <CustomDomainStub />
          </div>
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

function ProviderSelector({
  providers,
  value,
  disabled,
  onChange,
}: {
  providers: DeploymentProvider[];
  value: DeploymentProvider | null;
  disabled: boolean;
  onChange: (provider: DeploymentProvider) => void;
}) {
  return (
    <section className="rounded-panel border border-hairline bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">Deployment provider</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Hosting credentials stay securely on the Novy backend.
      </p>
      {providers.length > 0 ? (
        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="deployment-provider">
          Provider
          <select
            className="mt-1 block h-10 w-full rounded-tile border border-hairline bg-canvas px-3 text-sm text-ink"
            disabled={disabled}
            id="deployment-provider"
            onChange={(event) => onChange(event.target.value as DeploymentProvider)}
            value={value ?? providers[0]}
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider === 'development' ? 'Development preview' : provider[0]!.toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-4 rounded-tile border border-signal-invalid/30 bg-signal-invalid/5 p-3 text-sm text-signal-invalid" role="status">
          No deployment provider is configured on the backend.
        </p>
      )}
    </section>
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
      <p className="mt-1 text-sm text-ink-muted">
        Preview publishes a reviewable release. Production updates the live site your visitors use.
      </p>
      <div aria-label="Deployment environment" className="mt-4 grid grid-cols-2 gap-3" role="group">
        {(['preview', 'production'] as const).map((environment) => (
          <button
            aria-label={`${environment === 'preview' ? 'Preview' : 'Production'} environment`}
            aria-pressed={value === environment}
            className={`rounded-tile border p-4 text-left transition-colors ${
              value === environment
                ? 'border-brand-600 bg-brand-500/10 ring-1 ring-brand-600 dark:border-brand-400 dark:bg-brand-500/15 dark:ring-brand-400'
                : 'border-hairline hover:bg-canvas'
            }`}
            disabled={disabled}
            key={environment}
            onClick={() => onChange(environment)}
            type="button"
          >
            <span className="block text-sm font-semibold capitalize text-ink">{environment}</span>
            <span className="mt-1 block text-xs text-ink-muted">
              {environment === 'preview' ? 'Reviewable release' : 'Live release for visitors'}
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
