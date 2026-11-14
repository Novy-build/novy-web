import { Link } from 'react-router';
import type { ProjectSummary } from '@domain/entities/project';
import { ScreenFrame } from '@presentation/editor/renderer/ScreenFrame';
import { formatRelativeTime } from './formatRelativeTime';

interface ProjectCardProps {
  project: ProjectSummary;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * One project on the dashboard: a live cropped preview of the first screen,
 * summary meta, and management actions. The preview is the same renderer the
 * canvas and preview overlay use, just CSS-scaled.
 */
export function ProjectCard({ project, onRename, onDuplicate, onDelete }: ProjectCardProps) {
  const name = project.name;
  const screenLabel = project.screenCount === 1 ? 'screen' : 'screens';

  return (
    <article className="flex flex-col overflow-hidden rounded-panel border border-hairline bg-surface transition-colors focus-within:ring-2 hover:border-ink/15">
      <Link
        aria-label={`Open ${name}`}
        className="block overflow-hidden rounded-t-none bg-canvas"
        to={`/project/${project.id}/editor`}
      >
        <div className="flex h-40 justify-center overflow-hidden">
          <ScreenFrame mode="thumbnail" scale={0.75} screen={project.previewScreen} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">{name}</h2>
          <span className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {project.projectType === 'website' ? 'Website' : 'App'}
          </span>
        </div>
        <p className="mt-1 text-xs font-mono tabular-nums text-ink-muted">
          {project.screenCount} {screenLabel} &middot; Edited {formatRelativeTime(project.updatedAt, new Date())}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <CardAction label={`Rename ${name}`} onClick={onRename}>
            Rename
          </CardAction>
          <CardAction label={`Duplicate ${name}`} onClick={onDuplicate}>
            Duplicate
          </CardAction>
          <CardAction label={`Delete ${name}`} onClick={onDelete} tone="danger">
            Delete
          </CardAction>
        </div>
      </div>
    </article>
  );
}

interface CardActionProps {
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'danger';
  children: string;
}

function CardAction({ label, onClick, tone = 'neutral', children }: CardActionProps) {
  const toneClass = tone === 'danger' ? 'text-red-600 hover:text-red-700' : 'text-ink-muted hover:text-ink';
  return (
    <button
      aria-label={label}
      className={`rounded-tile px-1.5 py-1 text-xs font-medium transition-colors hover:bg-canvas focus-visible:outline-2 ${toneClass}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
