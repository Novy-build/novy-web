import type { PropsWithChildren } from 'react';

/** Transparent interaction wrapper. The canvas outline is editor-only. */
export function GestureDetectorNodeView({
  children,
  isCanvas,
}: PropsWithChildren<{ isCanvas: boolean }>) {
  return (
    <div
      className={`relative h-full w-full ${isCanvas ? 'rounded-tile border border-dashed border-brand-500/60' : ''}`}
      data-testid="gesture-detector"
    >
      {children}
    </div>
  );
}
