import type { ValidationIssue, ValidationReport } from '@domain/validation/projectValidation';

export function ValidationPanel({
  report,
  onIssueSelect,
}: {
  report: ValidationReport;
  onIssueSelect?: (issue: ValidationIssue) => void;
}) {
  const errors = report.issues.filter((issue) => issue.severity === 'error');
  const warnings = report.issues.filter((issue) => issue.severity === 'warning');
  return (
    <section aria-label="Validation" className="flex h-full flex-col bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Validation</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${report.isValid ? 'bg-signal-valid/10 text-signal-valid' : 'bg-signal-invalid/10 text-signal-invalid'}`}
          role="status"
        >
          {report.isValid ? 'Valid' : `${errors.length} error${errors.length === 1 ? '' : 's'}`}
        </span>
      </div>
      <p aria-live="polite" className="mt-2 text-xs text-ink-muted">
        {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning{warnings.length === 1 ? '' : 's'}.
      </p>
      {report.issues.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted" role="status">No validation issues found.</p>
      ) : (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {report.issues.map((issue) => (
            <button
              className="mb-2 block w-full rounded-tile border border-hairline bg-surface px-3 py-2 text-left text-xs transition-colors hover:border-brand-500/60 hover:bg-brand-500/10 focus-visible:outline-2 focus-visible:outline-brand-500"
              key={issue.id}
              onClick={() => onIssueSelect?.(issue)}
              type="button"
            >
              <span className={issue.severity === 'error' ? 'font-semibold text-red-700' : 'font-semibold text-amber-700'}>
                {issue.severity}
              </span>
              <span className="ml-2 text-ink">{issue.message}</span>
              <span className="mt-1 block text-[10px] text-ink-muted">
                {[
                  issue.code ? `Code: ${issue.code}` : null,
                  issue.area ? `Area: ${issue.area}` : null,
                  issue.screenId ? `Screen: ${issue.screenId}` : null,
                  issue.componentId ? `Component: ${issue.componentId}` : null,
                  issue.fieldId ? `Field: ${issue.fieldId}` : null,
                  issue.bindingTarget ? `Target: ${issue.bindingTarget}` : null,
                  issue.collectionId ? `Collection: ${issue.collectionId}` : null,
                  issue.behaviorId ? `Behavior: ${issue.behaviorId}` : null,
                  issue.graphId ? `Graph: ${issue.graphId}` : null,
                  issue.logicNodeId ? `Node: ${issue.logicNodeId}` : null,
                ].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
