import type { PropsWithChildren } from 'react';

interface LinearLayoutNodeViewProps extends PropsWithChildren {
  direction: 'column' | 'row';
}

/** Visual shell for Flutter-style Column and Row widgets. */
export function LinearLayoutNodeView({ children, direction }: LinearLayoutNodeViewProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-tile border border-dashed border-hairline bg-surface/60"
      data-layout-direction={direction}
    >
      {children}
    </div>
  );
}
