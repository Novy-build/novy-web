import { TEXT_FONT_WEIGHTS, type TextFontWeight } from '@domain/entities/componentNode';

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
