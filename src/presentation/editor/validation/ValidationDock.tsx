import { ChevronRight } from 'lucide-react';
import type { ValidationIssue, ValidationReport } from '@domain/validation/projectValidation';
import { Button } from '@presentation/components/ui/Button';
import { ResizeHandle } from '../layout/ResizeHandle';
import { useResizablePane } from '../layout/useResizablePane';
import { ValidationPanel } from './ValidationPanel';

const PANEL_ID = 'design-validation-panel';

export interface ValidationDockProps {
  isOpen: boolean;
  report: ValidationReport;
  onToggle: () => void;
  onCollapse: () => void;
  onIssueSelect?: (issue: ValidationIssue) => void;
  /** Data-load state shown instead of data-reference issues until it is ready. */
  dataStatus?: 'loading' | 'ready' | 'error';
  onRetryData?: () => void;
}

/**
 * Collapsible Validation dock at the bottom of the Design inspector. The header
 * toggles the panel, and the splitter can be dragged down past its minimum to
 * minimize the dock without reaching for the header.
 */
export function ValidationDock({
  isOpen,
  report,
  onToggle,
  onCollapse,
  onIssueSelect,
  onRetryData,
  dataStatus = 'ready',
}: ValidationDockProps) {
  const { size, isDragging, startResize, onKeyDown, reset } = useResizablePane({
    defaultSize: 200,
    minSize: 120,
    maxSize: 360,
    orientation: 'vertical',
    storageKey: 'novy.editor.layout.v1.inspector-validation',
    grow: -1,
    onCollapse,
  });
  const errorCount = report.issues.filter((issue) => issue.severity === 'error').length;
  const stateLabel = dataStatus === 'loading'
    ? '…'
    : dataStatus === 'error'
      ? '!'
      : report.isValid ? 'Valid' : String(errorCount);
  const badgeClass = dataStatus === 'loading'
    ? 'bg-canvas text-ink-muted'
    : dataStatus === 'error' || !report.isValid
      ? 'bg-signal-invalid/10 text-signal-invalid'
      : 'bg-signal-valid/10 text-signal-valid';

  return (
    <div className="shrink-0 border-t border-hairline">
      <button
        aria-controls={isOpen ? PANEL_ID : undefined}
        aria-expanded={isOpen}
        className="group flex w-full items-center justify-between gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500"
        onClick={onToggle}
        title={isOpen ? 'Collapse validation panel' : 'Expand validation panel'}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight
            aria-hidden="true"
            className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
            size={14}
            strokeWidth={2}
          />
          Validation
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {stateLabel}
        </span>
      </button>
      {isOpen ? (
        <div
          className="flex max-h-[40dvh] shrink-0 flex-col overflow-hidden border-t border-hairline"
          id={PANEL_ID}
          style={{ height: size }}
        >
          <ResizeHandle
            controls={PANEL_ID}
            isDragging={isDragging}
            label="Resize validation panel"
            max={360}
            min={120}
            onDoubleClick={reset}
            onKeyDown={onKeyDown}
            onPointerDown={startResize}
            orientation="vertical"
            value={size}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {dataStatus === 'loading' ? (
              <p className="p-4 text-sm text-ink-muted" role="status">
                Loading project data… reference validation resumes when it is ready.
              </p>
            ) : dataStatus === 'error' ? (
              <div className="p-4 text-sm">
                <p className="text-ink-muted" role="alert">Project data could not be loaded.</p>
                {onRetryData ? (
                  <Button className="mt-3" onClick={onRetryData} type="button">Retry</Button>
                ) : null}
              </div>
            ) : (
              <ValidationPanel onIssueSelect={onIssueSelect} report={report} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
