import type { PropsWithChildren } from 'react';
import type { ComponentBorderStyle } from '@domain/entities/componentNode';
import { widgetBorderCss } from './fieldStyle';

interface ContainerNodeViewProps extends PropsWithChildren {
  borderStyle?: ComponentBorderStyle;
}

/** Styling shell of a container; children are absolutely positioned inside. */
export function ContainerNodeView({ borderStyle, children }: ContainerNodeViewProps) {
  return (
    <div
      className="relative h-full w-full rounded-tile border border-hairline bg-surface"
      style={widgetBorderCss(borderStyle)}
    >
      {children}
    </div>
  );
}
