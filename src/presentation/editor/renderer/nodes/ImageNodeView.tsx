import type { ImageProps } from '@domain/entities/componentNode';

export function ImageNodeView({ props }: { props: ImageProps }) {
  if (!props.src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-tile border border-dashed border-hairline bg-surface text-sm text-ink-muted">
        Add an image
      </div>
    );
  }
  const fitClass = props.fit === 'contain' ? 'object-contain' : 'object-cover';
  return (
    <img
      alt={props.alt}
      className={`h-full w-full rounded-tile ${fitClass}`}
      src={props.src}
      tabIndex={-1}
    />
  );
}
