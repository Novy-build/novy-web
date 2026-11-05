import { useState, type FormEvent } from 'react';
import type { Template } from '@domain/entities/template';
import { Button } from '@presentation/components/ui/Button';
import { Modal } from '@presentation/components/system/Modal';
import { ScreenFrame } from '@presentation/editor/renderer/ScreenFrame';
import { TextInput } from '@presentation/components/ui/TextInput';

interface TemplateGalleryModalProps {
  templates: readonly Template[];
  onCancel: () => void;
  /** Creates the project through the dashboard hook; throws on failure. */
  onCreate: (name: string, template: Template) => Promise<void>;
}

/**
 * New Project gallery: every starter template rendered as a live mini preview,
 * one selectable, with a project name field wired to creation.
 */
export function TemplateGalleryModal({ templates, onCancel, onCreate }: TemplateGalleryModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates[0]?.id ?? null,
  );
  const [name, setName] = useState(defaultNameFor(templates[0]));
  const [hasEditedName, setHasEditedName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;

  function selectTemplate(template: Template) {
    setSelectedTemplateId(template.id);
    if (!hasEditedName) {
      setName(defaultNameFor(template));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTemplate) {
      return;
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Enter a project name.');
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      await onCreate(trimmed, selectedTemplate);
    } catch {
      setError('We could not create the project. Please try again.');
      setIsCreating(false);
    }
  }

  return (
    <Modal labelledBy="template-gallery-title" onClose={onCancel} panelClassName="max-w-2xl">
      <h2 className="text-lg font-semibold text-ink" id="template-gallery-title">
        Choose a starting template
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Pick a starter that matches what you want to build — everything stays editable.
      </p>

      {templates.length === 0 ? (
        <p className="mt-4 rounded-tile border border-hairline bg-canvas p-4 text-sm text-ink-muted" role="status">
          No templates are available right now.
          <button className="ml-1 text-brand-600 underline" onClick={onCancel} type="button">
            Close
          </button>
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <TemplateTile
              isSelected={selectedTemplateId === template.id}
              key={template.id}
              onSelect={() => selectTemplate(template)}
              template={template}
            />
          ))}
        </div>
      )}

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextInput
          error={error}
          hint="You can rename it any time from the dashboard."
          label="Project name"
          name="new-project-name"
          onChange={(event) => {
            setHasEditedName(true);
            setName(event.target.value);
          }}
          value={name}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!selectedTemplate} isLoading={isCreating} type="submit">
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateTile({
  template,
  isSelected,
  onSelect,
}: {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`rounded-panel border p-3 text-left transition-colors ${
        isSelected
          ? 'border-brand-600 bg-canvas ring-1 ring-brand-600'
          : 'border-hairline hover:bg-canvas'
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex h-32 justify-center overflow-hidden bg-surface">
        <ScreenFrame mode="thumbnail" scale={0.16} screen={template.screens[0] ?? null} />
      </div>
      <h3 className="mt-2 text-sm font-semibold text-ink">{template.name}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{template.description}</p>
    </button>
  );
}

function defaultNameFor(template: Template | undefined): string {
  if (!template) {
    return '';
  }
  return template.id === 'template_blank' ? 'Untitled project' : template.name;
}
