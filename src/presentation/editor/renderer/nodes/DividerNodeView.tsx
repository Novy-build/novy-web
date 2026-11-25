import type { DividerProps } from '@domain/entities/componentNode';
import type { CSSProperties } from 'react';

export function DividerNodeView({ props }: { props: DividerProps; renderStatic?: boolean }) {
  const colorStyle: CSSProperties = props.color ? { backgroundColor: props.color } : {};
  if (props.orientation === 'vertical') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-full bg-hairline" style={{ ...colorStyle, width: props.thickness }} />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center">
      <div className="w-full bg-hairline" style={{ ...colorStyle, height: props.thickness }} />
    </div>
  );
}