import { ExternalLink, Rocket } from 'lucide-react';
import type { PublishedApplication } from '@domain/entities/deployment';
import { Link } from 'react-router';
import { formatRelativeTime } from '@presentation/pages/projects/formatRelativeTime';

interface PublishedApplicationCardProps {
  application: PublishedApplication;
}

/** One published project with its derived active/inactive state. */
export function PublishedApplicationCard({ application }: PublishedApplicationCardProps) {
  const {
    active,
    deploymentCount,
    environment,
    lastPublishedAt,
    projectId,
    projectName,
    provider,
    status,
    url,
  } = application;

  return (
    <article className="flex h-full flex-col rounded-panel border border-hairline bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-ink" title={projectName}>
          {projectName}
        </h2>
        <span
          className={[
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
            active
              ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
              : 'bg-ink-muted/10 text-ink-muted ring-hairline',
          ].join(' ')}
        >
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <p className="mt-1 text-xs text-ink-muted">
        {provider ?? 'Unknown provider'}
        {environment ? ` · ${environment}` : ''}
      </p>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Last published</dt>
          <dd className="text-right font-medium text-ink">
            {formatRelativeTime(lastPublishedAt, new Date())}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Latest attempt</dt>
          <dd className="text-right font-medium capitalize text-ink">{status}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Publishes</dt>
          <dd className="text-right font-medium text-ink">{deploymentCount}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
        {url ? (
          <a
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            Open live app
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        ) : (
          <span className="text-sm text-ink-muted">No live URL</span>
        )}
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          to={`/project/${encodeURIComponent(projectId)}/deploy`}
        >
          <Rocket aria-hidden="true" size={14} />
          Deployment settings
        </Link>
      </div>
    </article>
  );
}
