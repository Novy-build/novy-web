import type { DividerProps } from '@domain/entities/componentNode';

export function DividerNodeView({ props }: { props: DividerProps; renderStatic?: boolean }) {
  if (props.orientation === 'vertical') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-full bg-hairline" style={{ width: props.thickness }} />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center">
      <div className="w-full bg-hairline" style={{ height: props.thickness }} />
    </div>
  );
}