import { useRef, useState, type FormEvent } from 'react';
import { formatRelativeTime } from '@presentation/pages/projects/formatRelativeTime';
import type { EditorMode } from '../state/editorState';
import type { ValidationReport } from '@domain/validation/projectValidation';
export interface AutosaveStatus {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}

interface EditorTopBarProps {
  projectName: string;
  onRenameProject: (name: string) => Promise<void>;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onDeploy: () => void;
  onBack: () => void;
  saving: AutosaveStatus;
  validation: ValidationReport;
}

export function autosaveStatusText(saving: AutosaveStatus, now: Date): string {
  if (saving.isSaving) {
    return 'Saving…';
  }
  if (saving.error) {
    return `Save failed — retrying… (${saving.error})`;
  }
  if (saving.hasUnsavedChanges) {
    return 'Unsaved changes';
  }
  if (saving.lastSavedAt) {
    return `Saved ${formatRelativeTime(saving.lastSavedAt, now)}`;
  }
  return 'Changes save automatically';
}

/**
 * Editor chrome: exit to Projects, inline-editable app name with autosave
 * status, Design|Logic modes, undo/redo, Preview, and the primary Deploy.
 */
export function EditorTopBar({
  projectName,
  onRenameProject,
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onDeploy,
  onBack,
  saving,
  validation,
}: EditorTopBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [error, setError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setDraftName(projectName);
    setError(null);
    setIsEditingName(true);
    requestAnimationFrame(() => renameInputRef.current?.select());
  }

  async function commitRename() {
    const next = draftName.trim();
    setIsEditingName(false);
    if (next.length === 0 || next === projectName) {
      return;
    }
    setError(null);
    try {
      await onRenameProject(next);
    } catch {
      setError('Rename failed. The tab may have closed.');
    }
  }

  function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void commitRename();
  }

  return (
    <header className="flex flex-col gap-2 border-b border-hairline bg-surface px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="shrink-0 rounded-tile border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            onClick={onBack}
            title="Return to projects"
            type="button"
          >
            Exit work
          </button>
          {isEditingName ? (
            <form onSubmit={handleRenameSubmit}>
              <input
                aria-label="Project name"
                autoFocus
                className="h-8 w-56 rounded-tile border border-brand-600 bg-surface px-2 text-sm font-semibold text-ink outline-none"
                onBlur={() => void commitRename()}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
                ref={renameInputRef}
                value={draftName}
              />
            </form>
          ) : (
            <button
              className="max-w-60 truncate rounded-tile px-2 py-1 text-sm font-semibold text-ink hover:bg-canvas"
              onClick={startEditing}
              title="Click to rename"
              type="button"
            >
              {projectName}
            </button>
          )}
          <p aria-live="polite" className="shrink-0 text-xs font-mono text-ink-muted" role={error || saving.error ? 'alert' : 'status'}>
            {error ?? autosaveStatusText(saving, new Date())}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${validation.isValid ? 'bg-signal-valid/10 text-signal-valid' : 'bg-signal-invalid/10 text-signal-invalid'}`}
            data-testid="validation-badge"
            role="status"
          >
            {validation.isValid ? 'Valid' : `${validation.issues.filter((issue) => issue.severity === 'error').length} errors`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            aria-label="Editor mode"
            className="grid h-8 grid-cols-3 gap-1 rounded-tile bg-canvas p-0.5"
            role="group"
          >
            {(['design', 'logic', 'data'] as const).map((candidate) => (
              <button
                aria-pressed={mode === candidate}
                className={`rounded-tile px-3 text-xs font-medium capitalize transition-colors ${
                  mode === candidate ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'
                }`}
                key={candidate}
                onClick={() => onModeChange(candidate)}
                type="button"
              >
                {candidate}
              </button>
            ))}
          </div>

          <button
            aria-label="Undo"
            className="rounded-tile p-1.5 text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canUndo}
            onClick={onUndo}
            type="button"
            title="Undo (Ctrl+Z)"
          >
            ⟲
          </button>
          <button
            aria-label="Redo"
            className="rounded-tile p-1.5 text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canRedo}
            onClick={onRedo}
            type="button"
            title="Redo (Ctrl+Shift+Z)"
          >
            ⟳
          </button>

          <div className="ml-2 flex items-center gap-2">
            <button
              className="rounded-tile px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
              onClick={onPreview}
              type="button"
            >
              Preview
            </button>
            <button
              className="rounded-tile bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              onClick={onDeploy}
              type="button"
            >
              Deploy
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
