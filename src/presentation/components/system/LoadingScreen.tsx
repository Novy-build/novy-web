import type { PropsWithChildren } from 'react';

interface LoadingScreenProps {
  label?: string;
}

/** Full-height centered loading state used by the route guard. */
export function LoadingScreen({ label = 'Loading…' }: PropsWithChildren<LoadingScreenProps>) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-full flex-col items-center justify-center gap-3 bg-canvas p-6"
      role="status"
    >
      <div
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-brand-600"
      />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
