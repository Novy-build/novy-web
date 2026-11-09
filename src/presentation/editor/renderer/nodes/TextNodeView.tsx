import type { CSSProperties } from 'react';
import type { TextProps } from '@domain/entities/componentNode';
import { TEXT_FONT_WEIGHT_VALUES } from './textTypography';

const levelClasses: Record<TextProps['level'], string> = {
  display: 'text-[26px] font-semibold tracking-tight text-ink',
  title: 'text-lg font-medium text-ink',
  body: 'text-sm text-ink-muted',
};

export function TextNodeView({ props }: { props: TextProps }) {
  // Custom sizes need a proportional line height; otherwise Tailwind's preset
  // line height would clip larger text.
  const hasSizeOverride = typeof props.fontSize === 'number' && props.fontSize > 0;
  const style: CSSProperties = {
    fontSize: hasSizeOverride ? `${props.fontSize}px` : undefined,
    fontWeight: props.fontWeight ? TEXT_FONT_WEIGHT_VALUES[props.fontWeight] : undefined,
    lineHeight: hasSizeOverride ? 1.25 : undefined,
  };

  return <p className={`break-words ${levelClasses[props.level]}`} style={style}>{props.text}</p>;
}
