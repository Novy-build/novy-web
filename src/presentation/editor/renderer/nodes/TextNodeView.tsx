import type { TextProps } from '@domain/entities/componentNode';

const levelClasses: Record<TextProps['level'], string> = {
  display: 'text-[26px] font-semibold tracking-tight text-ink',
  title: 'text-lg font-medium text-ink',
  body: 'text-sm text-ink-muted',
};

export function TextNodeView({ props }: { props: TextProps }) {
  return <p className={`break-words ${levelClasses[props.level]}`}>{props.text}</p>;
}
