import type { DeploymentRecord } from '@domain/entities/deployment';

interface DeploymentHistoryProps {
  deployments: DeploymentRecord[];
  isPublishing: boolean;
  onRedeploy: () => void;
}

/** Persisted publish history, newest first. Version numbers derive from order. */
export function DeploymentHistory({
  deployments,
  isPublishing,
  onRedeploy,
}: DeploymentHistoryProps) {
  return (
    <section className="rounded-panel border border-hairline bg-surface">
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Deployment history</h2>
        <p className="mt-1 text-sm text-ink-muted">Every publish attempt for this project.</p>
      </div>

      {deployments.length === 0 ? (
        <div className="px-5 py-10 text-center" role="status">
          <p className="text-sm font-medium text-ink">No deployments yet</p>
          <p className="mt-1 text-sm text-ink-muted">Publish this project to create version 1.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas font-mono text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-medium" scope="col">Version</th>
                <th className="px-5 py-3 font-medium" scope="col">Published</th>
                <th className="px-5 py-3 font-medium" scope="col">Status</th>
                <th className="px-5 py-3 font-medium" scope="col">Provider</th>
                <th className="px-5 py-3 text-right font-medium" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {deployments.map((deployment, index) => {
                const version = deployments.length - index;
                return (
                  <tr key={deployment.id}>
                    <td className="px-5 py-4 font-mono font-medium text-ink">v{version}</td>
                    <td className="px-5 py-4 text-ink-muted">
                      <time dateTime={deployment.createdAt.toISOString()}>
                        {formatDeploymentDate(deployment.createdAt)}
                      </time>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={deployment.status} />
                    </td>
                    <td className="px-5 py-4 capitalize text-ink-muted">{deployment.provider}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {deployment.url ? (
                          <a
                            className="rounded-tile border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
                            href={deployment.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View
                          </a>
                        ) : (
                          <button
                            className="rounded-tile border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted opacity-50"
                            disabled
                            type="button"
                          >
                            View
                          </button>
                        )}
                        <button
                          className="rounded-tile px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-50"
                          disabled={isPublishing}
                          onClick={onRedeploy}
                          type="button"
                        >
                          Redeploy
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: DeploymentRecord['status'] }) {
  const classes =
    status === 'live'
      ? 'bg-signal-valid/10 text-signal-valid'
      : status === 'failed'
        ? 'bg-signal-invalid/10 text-signal-invalid'
        : 'bg-brand-50 text-brand-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  );
}

export function formatDeploymentDate(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
