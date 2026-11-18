import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Globe2, PanelsTopLeft } from 'lucide-react';
import type { ProjectType } from '@domain/entities/project';
import type { Template } from '@domain/entities/template';
import { Modal } from '@presentation/components/system/Modal';
import { Button } from '@presentation/components/ui/Button';
import { TextInput } from '@presentation/components/ui/TextInput';
import { ScreenFrame } from '@presentation/editor/renderer/ScreenFrame';

interface NewProjectDialogProps {
  templates: readonly Template[];
  onCancel: () => void;
  onCreate: (name: string, template: Template) => Promise<void>;
}

export function NewProjectDialog({ templates, onCancel, onCreate }: NewProjectDialogProps) {
  const [step, setStep] = useState<'type' | 'template'>('type');
  const [projectType, setProjectType] = useState<ProjectType>('app');
  const visibleTemplates = useMemo(
    () => templates.filter((template) => template.projectType === projectType),
    [projectType, templates],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = visibleTemplates.find((template) => template.id === selectedTemplateId)
    ?? visibleTemplates[0]
    ?? null;
  const [name, setName] = useState('');
  const [hasEditedName, setHasEditedName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function chooseType(type: ProjectType): void {
    setProjectType(type);
    setSelectedTemplateId(null);
    setName('');
    setHasEditedName(false);
    setError(null);
    setStep('template');
  }

  function selectTemplate(template: Template): void {
    setSelectedTemplateId(template.id);
    if (!hasEditedName) setName(defaultProjectName(template));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedTemplate) return;
    const projectName = (name || defaultProjectName(selectedTemplate)).trim();
    if (!projectName) {
      setError('Enter a project name.');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await onCreate(projectName, selectedTemplate);
    } catch {
      setError('We could not create the project. Please try again.');
      setIsCreating(false);
    }
  }

  return (
    <Modal labelledBy="new-project-title" onClose={onCancel} panelClassName="max-w-4xl">
      {step === 'type' ? (
        <>
          <h2 className="text-lg font-semibold text-ink" id="new-project-title">What do you want to build?</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Choose the editing experience that matches your project. You cannot change this later.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProjectTypeCard
              description="Build interactive screens, data, and event-driven workflows."
              icon={PanelsTopLeft}
              label="Web app"
              onSelect={() => chooseType('app')}
            />
            <ProjectTypeCard
              description="Build scrolling pages from reusable marketing sections."
              icon={Globe2}
              label="Website"
              onSelect={() => chooseType('website')}
            />
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={onCancel} type="button" variant="ghost">Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <button
            className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-tile px-2 text-sm font-medium text-ink-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
            onClick={() => setStep('type')}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Change project type
          </button>
          <h2 className="text-lg font-semibold text-ink" id="new-project-title">
            Choose a {projectType === 'website' ? 'website' : 'web app'} template
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Everything in the starter remains editable.</p>

          {visibleTemplates.length === 0 ? (
            <p className="mt-4 rounded-tile border border-hairline bg-canvas p-4 text-sm text-ink-muted" role="status">
              No templates are available for this project type.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="template-grid">
              {visibleTemplates.map((template) => {
                const selected = selectedTemplate?.id === template.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`flex min-h-0 flex-col rounded-panel border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                      selected ? 'border-brand-600 bg-canvas ring-1 ring-brand-600' : 'border-hairline hover:bg-canvas'
                    }`}
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    type="button"
                  >
                    <div className="flex h-28 shrink-0 justify-center overflow-hidden rounded-tile bg-surface">
                      <ScreenFrame designSystem={template.designSystem} mode="thumbnail" scale={0.16} screen={template.screens[0] ?? null} />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-ink">{template.name}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{template.description}</p>
                  </button>
                );
              })}
            </div>
          )}

          <form className="mt-5 flex flex-col gap-4" noValidate onSubmit={submit}>
            <TextInput
              error={error}
              hint="You can rename it any time from the dashboard."
              label="Project name"
              name="new-project-name"
              onChange={(event) => {
                setHasEditedName(true);
                setName(event.target.value);
              }}
              value={name || (hasEditedName ? '' : defaultProjectName(selectedTemplate))}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={onCancel} type="button" variant="ghost">Cancel</Button>
              <Button disabled={!selectedTemplate} isLoading={isCreating} type="submit">Create project</Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

interface ProjectTypeCardProps {
  label: string;
  description: string;
  icon: typeof Globe2;
  onSelect: () => void;
}

function ProjectTypeCard({ label, description, icon: Icon, onSelect }: ProjectTypeCardProps) {
  return (
    <button
      aria-label={label}
      className="group min-h-36 rounded-panel border border-hairline bg-surface p-5 text-left transition-colors hover:border-brand-500 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      onClick={onSelect}
      type="button"
    >
      <Icon aria-hidden="true" className="text-brand-600" size={28} />
      <span className="mt-4 block text-base font-semibold text-ink">{label}</span>
      <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{description}</span>
    </button>
  );
}

function defaultProjectName(template: Template | null): string {
  if (!template) return '';
  return template.id === 'template_blank' ? 'Untitled project' : template.name;
}
