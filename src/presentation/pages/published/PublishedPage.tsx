import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@presentation/components/ui/Button';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { PublishedApplicationCard } from './PublishedApplicationCard';
import { usePublishedApplications } from './usePublishedApplications';

type PublishedFilter = 'all' | 'active' | 'inactive';

const FILTERS: Array<{ id: PublishedFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

/** Owner-wide view of published applications and their derived live state. */
export function PublishedPage() {
  const { applications, isLoading, hasFailed, reload } = usePublishedApplications();
  const [filter, setFilter] = useState<PublishedFilter>('all');

  const activeCount = applications.filter((item) => item.active).length;
  const visibleApplications = useMemo(() => {
    if (filter === 'active') return applications.filter((item) => item.active);
    if (filter === 'inactive') return applications.filter((item) => !item.active);
    return applications;
  }, [applications, filter]);

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Published</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Applications you have published, with their current live status.
            </p>
          </div>
          {!isLoading && !hasFailed && applications.length > 0 ? (
            <p className="text-sm text-ink-muted" role="status">
              {activeCount} active · {applications.length - activeCount} inactive
            </p>
          ) : null}
        </div>

        {!isLoading && !hasFailed && applications.length > 0 ? (
          <div
            aria-label="Filter published applications"
            className="mt-6 inline-flex rounded-tile border border-hairline bg-surface p-1"
            role="group"
          >
            {FILTERS.map((option) => (
              <button
                aria-pressed={filter === option.id}
                className={[
                  'rounded-tile px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === option.id
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-muted hover:bg-canvas hover:text-ink',
                ].join(' ')}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8">
            <LoadingScreen label="Loading published applications…" />
          </div>
        ) : hasFailed ? (
          <FailurePanel onRetry={reload} />
        ) : applications.length === 0 ? (
          <EmptyState />
        ) : visibleApplications.length === 0 ? (
          <p className="mt-12 rounded-panel border border-dashed border-hairline bg-surface p-10 text-center text-sm text-ink-muted">
            No {filter} applications.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleApplications.map((application) => (
              <li key={application.projectId}>
                <PublishedApplicationCard application={application} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-12 rounded-panel border border-dashed border-hairline bg-surface p-12 text-center">
      <h2 className="text-lg font-semibold text-ink">Nothing published yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Open a project and choose Deploy to publish your first application. Its live status will
        appear here.
      </p>
      <Link
        className="mt-5 inline-flex items-center justify-center rounded-tile bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        to="/projects"
      >
        Go to projects
      </Link>
    </section>
  );
}

function FailurePanel({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mt-12 rounded-panel border border-hairline bg-surface p-12 text-center">
      <h2 className="text-lg font-semibold text-ink">
        We could not load your published applications
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        Something went wrong while fetching publishing history. Try again in a moment.
      </p>
      <Button className="mt-5" onClick={onRetry}>
        Reload
      </Button>
    </section>
  );
}
