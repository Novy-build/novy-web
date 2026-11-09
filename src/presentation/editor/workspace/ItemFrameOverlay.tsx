import type { EdgeInsets } from '@domain/entities/componentNode';

export interface ItemFrameOverlayProps {
  /** Cross-axis size of the repeated item (ListView width for vertical). */
  crossExtent: number;
  /** Computed main-axis extent of the repeated item. */
  itemExtent: number;
  /** Repeated-item padding, drawn as an inset gutter. */
  padding: EdgeInsets;
  /** Gap between repeated items. */
  spacing: number;
  /** Corner radius of the repeated item container. */
  radius: number;
  /** Whether dividers are drawn between repeated items. */
  showDividers: boolean;
  /** Main-axis orientation of the ListView. */
  direction: 'vertical' | 'horizontal';
  /** Current canvas zoom. */
  zoom: number;
}

/**
 * Editor-only guide shown while the item frame itself is selected. It is an
 * outline, not a second selection: the solid frame is the item container, the
 * dashed inner rectangle is its padding, and the ghost is the next repeated item.
 */
export function ItemFrameOverlay({
  crossExtent,
  itemExtent,
  padding,
  spacing,
  radius,
  showDividers,
  direction,
  zoom,
}: ItemFrameOverlayProps) {
  const vertical = direction === 'vertical';
  const safeExtent = Math.max(1, itemExtent);
  const unscaledWidth = vertical ? crossExtent : safeExtent;
  const unscaledHeight = vertical ? safeExtent : crossExtent;
  const frameWidth = unscaledWidth * zoom;
  const frameHeight = unscaledHeight * zoom;
  const radiusPx = Math.max(0, radius) * zoom;
  const maxHorizontalInset = Math.max(1, unscaledWidth) / 2;
  const maxVerticalInset = Math.max(1, unscaledHeight) / 2;
  const leftInset = Math.min(Math.max(0, padding.left), maxHorizontalInset);
  const rightInset = Math.min(Math.max(0, padding.right), maxHorizontalInset);
  const topInset = Math.min(Math.max(0, padding.top), maxVerticalInset);
  const bottomInset = Math.min(Math.max(0, padding.bottom), maxVerticalInset);
  const spacingPx = Math.max(0, spacing) * zoom;
  const ghostMainOffset = (safeExtent + Math.max(0, spacing)) * zoom;

  const innerWidth = Math.max(1, frameWidth - (leftInset + rightInset) * zoom);
  const innerHeight = Math.max(1, frameHeight - (topInset + bottomInset) * zoom);
  const innerRadiusPx = Math.max(0, radius - Math.min(leftInset, rightInset, topInset, bottomInset)) * zoom;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible"
      data-testid="item-frame-overlay"
    >
      <span
        className="absolute text-[11px] font-semibold text-brand-600"
        style={{ left: 0, top: -20 * zoom }}
      >
        Item frame
      </span>
      <div
        className="absolute border-2 border-brand-500"
        data-testid="item-frame"
        style={{
          borderRadius: radiusPx,
          height: frameHeight,
          left: 0,
          top: 0,
          width: frameWidth,
        }}
      />
      {leftInset + rightInset + topInset + bottomInset > 0 ? (
        <div
          className="absolute border border-dashed border-brand-500/70"
          data-testid="item-frame-padding"
          style={{
            borderRadius: innerRadiusPx,
            height: innerHeight,
            left: leftInset * zoom,
            top: topInset * zoom,
            width: innerWidth,
          }}
        />
      ) : null}
      <div
        className="absolute border border-dashed border-brand-500/35"
        data-testid="item-frame"
        style={{
          borderRadius: radiusPx,
          height: frameHeight,
          left: vertical ? 0 : ghostMainOffset,
          opacity: 0.35,
          top: vertical ? ghostMainOffset : 0,
          width: frameWidth,
        }}
      />
      {showDividers ? (
        <div
          aria-hidden="true"
          className="absolute border-brand-500/35"
          data-testid="item-frame-divider"
          style={
            vertical
              ? { borderTopStyle: 'dashed', borderTopWidth: 1, left: 0, right: 0, top: ghostMainOffset }
              : { borderLeftStyle: 'dashed', borderLeftWidth: 1, bottom: 0, left: ghostMainOffset, top: 0 }
          }
        />
      ) : null}
      {spacingPx > 0 ? (
        <span
          className="absolute text-[10px] font-medium text-brand-500/70"
          style={
            vertical
              ? { left: frameWidth + 4, top: safeExtent * zoom + spacingPx / 2 - 5 }
              : { left: safeExtent * zoom + spacingPx / 2 - 12, top: frameHeight + 4 }
          }
        >
          {spacing}
        </span>
      ) : null}
    </div>
  );
}