import { useState } from 'react';
import { Button } from '@presentation/components/ui/Button';
import { Modal } from '@presentation/components/system/Modal';
import type { ProjectSummary } from '@domain/entities/project';

interface ConfirmDeleteDialogProps {
  project: ProjectSummary;
  onCancel: () => void;
  /** Throws on failure; the dialog shows a generic failure message. */
  onConfirm: () => Promise<void>;
}

/**
 * Irreversible delete confirmation, spelling out exactly what is destroyed so
 * nobody nukes a project by accident.
 */
export function ConfirmDeleteDialog({ project, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch {
      setError('We could not delete the project. Please try again.');
      setIsDeleting(false);
    }
  }

  return (
    <Modal labelledBy="delete-dialog-title" onClose={onCancel}>
      <h2 className="text-lg font-semibold text-ink" id="delete-dialog-title">
        Delete this project?
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        {project.name} and its {project.screenCount}{' '}
        {project.screenCount === 1 ? 'screen' : 'screens'} will be permanently removed. This
        cannot be undone.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button isLoading={isDeleting} onClick={() => void handleConfirm()} variant="danger">
          Delete project
        </Button>
      </div>
    </Modal>
  );
}
