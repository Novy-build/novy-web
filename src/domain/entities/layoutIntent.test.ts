import { describe, expect, it } from 'vitest';
import { bottomAnchorFrameStyle, viewportFillStyle } from './layoutIntent';

describe('editor layout intent', () => {
  it('mirrors the generated runtime bottom-anchor styles', () => {
    expect(bottomAnchorFrameStyle(620, false)).toEqual({ top: 620 });
    expect(bottomAnchorFrameStyle(620, true)).toEqual({ top: 'auto', bottom: 24 });
  });

  it('uses dynamic viewport height with a keyboard-safe fallback', () => {
    expect(viewportFillStyle(false, 500)).toEqual({});
    expect(viewportFillStyle(true, 500)).toEqual({
      '--novy-viewport-height': '500px',
      minHeight: 'var(--novy-viewport-height, 100dvh)',
    });
  });

  it.each([
    ['mobile', 390, 780],
    ['tablet', 768, 1024],
    ['desktop', 1200, 800],
  ] as const)('keeps viewport fill and bottom anchoring identical at %s', (_viewport, width, visualHeight) => {
    const fill = viewportFillStyle(true, visualHeight);
    expect(fill).toEqual({
      '--novy-viewport-height': `${visualHeight}px`,
      minHeight: 'var(--novy-viewport-height, 100dvh)',
    });
    expect(bottomAnchorFrameStyle(visualHeight - 40, true)).toEqual({ top: 'auto', bottom: 24 });
    expect(bottomAnchorFrameStyle(visualHeight - 40, false)).toEqual({ top: visualHeight - 40 });
    expect(width).toBeGreaterThan(0);
  });
});
