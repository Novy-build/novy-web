import type { ComponentBorderStyle, ImageProps } from '@domain/entities/componentNode';
import { widgetBorderCss } from './fieldStyle';

export function ImageNodeView({ props, borderStyle }: { props: ImageProps; borderStyle?: ComponentBorderStyle }) {
  if (!props.src) {
    return (
      <div
        className="novy-widget-text-muted flex h-full w-full items-center justify-center rounded-tile border border-hairline bg-surface text-sm"
        style={widgetBorderCss(borderStyle)}
      >
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
