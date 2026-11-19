import { ChevronLeft, ChevronRight } from 'lucide-react';

type PanelSide = 'left' | 'right';

interface PanelCollapseButtonProps {
  className?: string;
  controls: string;
  isCollapsed: boolean;
  label: string;
  onToggle: () => void;
  side: PanelSide;
}

export function PanelCollapseButton({
  className = '',
  controls,
  isCollapsed,
  label,
  onToggle,
  side,
}: PanelCollapseButtonProps) {
  const action = isCollapsed ? 'Expand' : 'Collapse';
  const pointsLeft = side === 'left' ? !isCollapsed : isCollapsed;
  const Icon = pointsLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      aria-controls={controls}
      aria-expanded={!isCollapsed}
      aria-label={`${action} ${label}`}
      className={`grid h-11 w-11 shrink-0 place-items-center text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 ${className}`}
      onClick={onToggle}
      title={`${action} ${label}`}
      type="button"
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
    </button>
  );
}

interface CollapsedPanelRailProps {
  controls: string;
  label: string;
  onExpand: () => void;
  side: PanelSide;
}

export function CollapsedPanelRail({ controls, label, onExpand, side }: CollapsedPanelRailProps) {
  return (
    <aside
      aria-label={`${label} minimized`}
      className={`flex w-11 shrink-0 flex-col items-center bg-surface ${
        side === 'left' ? 'border-r border-hairline' : 'border-l border-hairline'
      }`}
      id={controls}
    >
      <PanelCollapseButton
        controls={controls}
        isCollapsed
        label={label}
        onToggle={onExpand}
        side={side}
      />
      <button
        className="mt-2 rotate-180 text-[10px] font-semibold uppercase tracking-widest text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 [writing-mode:vertical-rl]"
        onClick={onExpand}
        title={`Expand ${label}`}
        type="button"
      >
        {label}
      </button>
    </aside>
  );
}
