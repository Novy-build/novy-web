import type { CSSProperties } from 'react';

/** Deterministic editor-side mirror of the generated runtime layout intent. */
export function bottomAnchorFrameStyle(y: number, anchored: boolean): CSSProperties {
  return anchored ? { top: 'auto', bottom: 24 } : { top: y };
}

export function viewportFillStyle(enabled: boolean, visualHeight: number): CSSProperties {
  if (!enabled) return {};
  return {
    '--novy-viewport-height': `${visualHeight}px`,
    minHeight: 'var(--novy-viewport-height, 100dvh)',
  } as CSSProperties;
}
