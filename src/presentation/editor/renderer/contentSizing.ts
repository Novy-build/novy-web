export type ContentSizeTier = 'compact' | 'small' | 'regular';

export interface ContentSize {
  width: number;
  height: number;
  tier: ContentSizeTier;
}

/** Shared editor/runtime breakpoints for content inside a resized widget. */
export function resolveContentSize(width: number, height: number): ContentSize {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const tier: ContentSizeTier = safeWidth <= 180 || safeHeight <= 56
    ? 'compact'
    : safeWidth < 300 || safeHeight < 140
      ? 'small'
      : 'regular';
  return { width: safeWidth, height: safeHeight, tier };
}
