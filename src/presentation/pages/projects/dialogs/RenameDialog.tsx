import { useState, type FormEvent } from 'react';
import { Button } from '@presentation/components/ui/Button';
import { Modal } from '@presentation/components/system/Modal';
import { TextInput } from '@presentation/components/ui/TextInput';
import type { ProjectSummary } from '@domain/entities/project';

interface RenameDialogProps {
  project: ProjectSummary;
  onCancel: () => void;
  /** Throws on failure; the dialog displays a generic failure message. */
  onConfirm: (newName: string) => Promise<void>;
}

/**
 * Rename flow with the current project name prefilled; keeps the dialog open
 * while saving so a failure never loses the user's input.
 */
export function RenameDialog({ project, onCancel, onConfirm }: RenameDialogProps) {
  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Enter a project name.');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onConfirm(trimmed);
    } catch {
      setError('We could not rename the project. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <Modal labelledBy="rename-dialog-title" onClose={onCancel}>
      <h2 className="text-lg font-semibold text-ink" id="rename-dialog-title">
        Rename project
      </h2>
      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextInput
          error={error}
          label="Project name"
          name="project-name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button isLoading={isSaving} type="submit">
            Save name
          </Button>
        </div>
      </form>
    </Modal>
  );
}
