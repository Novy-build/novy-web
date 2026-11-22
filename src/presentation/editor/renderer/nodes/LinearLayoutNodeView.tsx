import type { PropsWithChildren } from 'react';
import type { ComponentBorderStyle } from '@domain/entities/componentNode';
import { widgetBorderCss } from './fieldStyle';

interface LinearLayoutNodeViewProps extends PropsWithChildren {
  borderStyle?: ComponentBorderStyle;
  direction: 'column' | 'row';
}

/** Visual shell for Flutter-style Column and Row widgets. */
export function LinearLayoutNodeView({ borderStyle, children, direction }: LinearLayoutNodeViewProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-tile border border-hairline bg-surface/60"
      data-layout-direction={direction}
      style={widgetBorderCss(borderStyle)}
    >
      {children}
    </div>
  );
}
