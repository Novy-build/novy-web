import type { PropsWithChildren } from 'react';

/** Styling shell of a container; children are absolutely positioned inside. */
export function ContainerNodeView({ children }: PropsWithChildren) {
  return (
    <div className="relative h-full w-full rounded-tile border border-hairline bg-surface">
      {children}
    </div>
  );
}
