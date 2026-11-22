import type { CSSProperties } from 'react';
import { TEXT_FONT_WEIGHTS, type InputTextStyle, type TextFontWeight } from '@domain/entities/componentNode';

const TEXT_FONT_WEIGHT_LABELS: Readonly<Record<TextFontWeight, string>> = {
  normal: 'Normal',
  medium: 'Medium',
  semibold: 'Semibold',
  bold: 'Bold',
};

export const TEXT_FONT_WEIGHT_OPTIONS: ReadonlyArray<{ value: TextFontWeight; label: string }> =
  TEXT_FONT_WEIGHTS.map((value) => ({ value, label: TEXT_FONT_WEIGHT_LABELS[value] }));

export const TEXT_FONT_WEIGHT_VALUES: Readonly<Record<TextFontWeight, number>> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/** Converts authored Input typography to inline CSS for the actual control. */
export function inputTextStyleCss(style: InputTextStyle | undefined): CSSProperties {
  if (!style) return {};
  return {
    fontFamily: style.fontFamily || undefined,
    fontSize: style.fontSize && style.fontSize > 0 ? `${style.fontSize}px` : undefined,
    fontWeight: style.fontWeight ? TEXT_FONT_WEIGHT_VALUES[style.fontWeight] : undefined,
    lineHeight: style.lineHeight && style.lineHeight > 0 ? style.lineHeight : undefined,
    letterSpacing: typeof style.letterSpacing === 'number' ? `${style.letterSpacing}px` : undefined,
    textAlign: style.textAlign,
    fontStyle: style.fontStyle,
    textTransform: style.textTransform === 'none' ? undefined : style.textTransform,
  };
}
