import type { ReactNode } from 'react';

export type ResizeHandleOrientation = 'horizontal' | 'vertical';

export interface ResizeHandleProps {
  orientation: ResizeHandleOrientation;
  isDragging: boolean;
  label: string;
  controls: string;
  value: number;
  min: number;
  max: number;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  className?: string;
}

/**
 * Accessible splitter between two resizable panes. The visible line is thin,
 * while the hit area stays large enough for pointer and touch interaction.
 */
export function ResizeHandle({
  orientation,
  isDragging,
  label,
  controls,
  value,
  min,
  max,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
  className = '',
}: ResizeHandleProps): ReactNode {
  const horizontal = orientation === 'horizontal';

  return (
    <div
      aria-controls={controls}
      aria-label={label}
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={value}
      className={`group relative z-20 shrink-0 touch-none focus-visible:outline-2 focus-visible:outline-brand-500 ${
        horizontal ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      } ${className}`}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      role="separator"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className={`absolute bg-hairline transition-colors group-hover:bg-brand-500 group-focus-visible:bg-brand-500 ${
          isDragging ? 'bg-brand-500' : ''
        } ${
          horizontal
            ? 'inset-y-0 left-1/2 w-px -translate-x-1/2'
            : 'inset-x-0 top-1/2 h-px -translate-y-1/2'
        }`}
      />
    </div>
  );
}