import type { CSSProperties } from 'react';
import type { TextProps } from '@domain/entities/componentNode';
import { TEXT_FONT_WEIGHT_VALUES } from './textTypography';

const levelClasses: Record<TextProps['level'], string> = {
  display: 'text-[26px] font-semibold tracking-tight',
  title: 'text-lg font-medium',
  body: 'text-sm',
};

export function TextNodeView({ props }: { props: TextProps }) {
  // Custom sizes need a proportional line height; otherwise Tailwind's preset
  // line height would clip larger text.
  const hasSizeOverride = typeof props.fontSize === 'number' && props.fontSize > 0;
  const style: CSSProperties = {
    fontFamily: props.fontFamily || undefined,
    fontSize: hasSizeOverride ? `${props.fontSize}px` : undefined,
    fontWeight: props.fontWeight ? TEXT_FONT_WEIGHT_VALUES[props.fontWeight] : undefined,
    lineHeight: props.lineHeight ?? (hasSizeOverride ? 1.25 : undefined),
    letterSpacing: typeof props.letterSpacing === 'number' ? `${props.letterSpacing}px` : undefined,
    textAlign: props.textAlign,
    fontStyle: props.fontStyle,
    textTransform: props.textTransform === 'none' ? undefined : props.textTransform,
    color: props.level === 'body'
      ? 'var(--novy-component-text, var(--novy-app-text-muted, var(--color-ink-muted)))'
      : 'var(--novy-component-text, var(--novy-app-text, var(--color-ink)))',
    display: props.lineClamp ? '-webkit-box' : undefined,
    WebkitBoxOrient: props.lineClamp ? 'vertical' : undefined,
    WebkitLineClamp: props.lineClamp,
    overflow: props.lineClamp ? 'hidden' : undefined,
  };

  return <p className={`break-words ${levelClasses[props.level]}`} style={style} title={props.text}>{props.text}</p>;
}
