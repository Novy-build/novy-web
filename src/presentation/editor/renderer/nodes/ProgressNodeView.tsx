import type { ProgressProps } from '@domain/entities/componentNode';

export function ProgressNodeView({ props }: { props: ProgressProps }) {
  const value = Math.min(100, Math.max(0, props.value));
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {props.label ? <span className="text-xs font-medium text-ink-muted">{props.label}</span> : null}
      {props.indeterminate ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
          <div className="h-2 w-1/3 animate-pulse rounded-full bg-brand-600" />
        </div>
      ) : (
        <div className="h-2 w-full rounded-full bg-hairline">
          <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${value}%` }} />
        </div>
      )}
    </div>
  );
}