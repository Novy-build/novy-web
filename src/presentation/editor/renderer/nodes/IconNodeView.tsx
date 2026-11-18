import type { IconProps } from '@domain/entities/componentNode';
import { AppIcon } from './appIcons';

export function IconNodeView({ props, size }: { props: IconProps; size: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center" data-app-icon={props.icon}>
      <AppIcon
        label={props.label.trim() || undefined}
        name={props.icon}
        size={Math.max(8, size)}
        strokeWidth={props.strokeWidth}
      />
    </span>
  );
}
